// Command tray is a small Windows tray app that polls the guarantee system
// and raises desktop toasts for things staff should look at: pending
// guarantees, technician sign-ups, part requests, and guarantees expiring
// within three months.
package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/getlantern/systray"
	"github.com/go-toast/toast"
)

type config struct {
	APIURL          string `json:"api_url"`  // e.g. http://localhost:8080/api/v1
	WebURL          string `json:"web_url"`  // opened when a toast or menu item is clicked
	Username        string `json:"username"` // a staff (admin/technical) account
	Password        string `json:"password"`
	IntervalSeconds int    `json:"interval_seconds"` // default 60
}

type notification struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

var (
	cfg     config
	dir     string
	token   string
	mu      sync.Mutex
	seen    = map[string]bool{}
	first   = true
	checkCh = make(chan struct{}, 1)
	client  = &http.Client{Timeout: 15 * time.Second}
)

var (
	colorOK    = color.RGBA{0x2b, 0x6c, 0xb0, 0xff}
	colorAlert = color.RGBA{0xd9, 0x48, 0x2b, 0xff}
	colorDown  = color.RGBA{0x80, 0x80, 0x80, 0xff}
)

func main() {
	exe, _ := os.Executable()
	dir = filepath.Dir(exe)
	if f, err := os.OpenFile(filepath.Join(dir, "tray.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644); err == nil {
		log.SetOutput(f)
	}
	if err := loadConfig(); err != nil {
		log.Println(err)
		toastMsg("Guarantee notifier", err.Error(), "")
		return
	}
	loadSeen()
	systray.Run(onReady, func() {})
}

func loadConfig() error {
	b, err := os.ReadFile(filepath.Join(dir, "tray.json"))
	if err != nil {
		return fmt.Errorf("cannot read tray.json next to the exe: %w", err)
	}
	if err := json.Unmarshal(b, &cfg); err != nil {
		return fmt.Errorf("tray.json is invalid: %w", err)
	}
	cfg.APIURL = strings.TrimRight(cfg.APIURL, "/")
	if cfg.APIURL == "" || cfg.Username == "" || cfg.Password == "" {
		return fmt.Errorf("tray.json needs api_url, username and password")
	}
	if cfg.IntervalSeconds < 15 {
		cfg.IntervalSeconds = 60
	}
	return nil
}

func seenPath() string { return filepath.Join(dir, "seen.json") }

// loadSeen restores what was already announced so a restart does not replay
// every pending item as new.
func loadSeen() {
	b, err := os.ReadFile(seenPath())
	if err != nil {
		return
	}
	var ids []string
	if json.Unmarshal(b, &ids) == nil {
		for _, id := range ids {
			seen[id] = true
		}
		first = false
	}
}

// saveSeen keeps only ids still present, so an item that reappears later
// (for example a re-submitted guarantee) is announced again.
func saveSeen(current []notification) {
	next := map[string]bool{}
	ids := []string{}
	for _, n := range current {
		next[n.ID] = true
		ids = append(ids, n.ID)
	}
	seen = next
	b, _ := json.Marshal(ids)
	_ = os.WriteFile(seenPath(), b, 0o644)
}

func onReady() {
	systray.SetIcon(makeIcon(colorOK))
	systray.SetTitle("Guarantees")
	systray.SetTooltip("Guarantee notifier")

	status := systray.AddMenuItem("Starting...", "")
	status.Disable()
	systray.AddSeparator()
	open := systray.AddMenuItem("Open dashboard", "")
	check := systray.AddMenuItem("Check now", "")
	systray.AddSeparator()
	quit := systray.AddMenuItem("Quit", "")

	go func() {
		t := time.NewTicker(time.Duration(cfg.IntervalSeconds) * time.Second)
		defer t.Stop()
		poll(status)
		for {
			select {
			case <-t.C:
			case <-checkCh:
			}
			poll(status)
		}
	}()
	go func() {
		for {
			select {
			case <-open.ClickedCh:
				openURL(cfg.WebURL)
			case <-check.ClickedCh:
				select {
				case checkCh <- struct{}{}:
				default:
				}
			case <-quit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func poll(status *systray.MenuItem) {
	items, err := fetch()
	if err != nil {
		log.Println("poll:", err)
		status.SetTitle("Offline: " + err.Error())
		systray.SetIcon(makeIcon(colorDown))
		return
	}

	var fresh []notification
	for _, n := range items {
		if !seen[n.ID] {
			fresh = append(fresh, n)
		}
	}
	saveSeen(items)

	if len(items) == 0 {
		status.SetTitle("Nothing needs attention")
		systray.SetTooltip("Guarantee notifier: all clear")
		systray.SetIcon(makeIcon(colorOK))
	} else {
		status.SetTitle(fmt.Sprintf("%d item(s) need attention", len(items)))
		systray.SetTooltip(fmt.Sprintf("Guarantee notifier: %d need attention", len(items)))
		systray.SetIcon(makeIcon(colorAlert))
	}

	switch {
	case len(fresh) == 0:
	case first || len(fresh) > 3:
		// First run, or a burst: one summary instead of a toast storm.
		toastMsg("Guarantee system", fmt.Sprintf("%d item(s) need attention", len(fresh)), cfg.WebURL)
	default:
		for _, n := range fresh {
			toastMsg(n.Title, n.Body, cfg.WebURL)
		}
	}
	first = false
}

func fetch() ([]notification, error) {
	mu.Lock()
	defer mu.Unlock()
	for attempt := 0; attempt < 2; attempt++ {
		if token == "" {
			if err := login(); err != nil {
				return nil, err
			}
		}
		req, _ := http.NewRequest("GET", cfg.APIURL+"/dashboard/notifications", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("server unreachable")
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == http.StatusUnauthorized {
			token = "" // expired: log in again once
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("server returned %d", resp.StatusCode)
		}
		var out struct {
			Data struct {
				Items []notification `json:"items"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &out); err != nil {
			return nil, err
		}
		return out.Data.Items, nil
	}
	return nil, fmt.Errorf("login rejected")
}

func login() error {
	b, _ := json.Marshal(map[string]string{"username": cfg.Username, "password": cfg.Password})
	resp, err := client.Post(cfg.APIURL+"/auth/login", "application/json", bytes.NewReader(b))
	if err != nil {
		return fmt.Errorf("server unreachable")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("login failed (%d)", resp.StatusCode)
	}
	var out struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return err
	}
	token = out.Data.Token
	if token == "" {
		token = out.Token
	}
	if token == "" {
		return fmt.Errorf("login returned no token")
	}
	return nil
}

func toastMsg(title, msg, url string) {
	n := toast.Notification{AppID: "Guarantee System", Title: title, Message: msg}
	if url != "" {
		n.ActivationType = "protocol"
		n.ActivationArguments = url
	}
	if err := n.Push(); err != nil {
		log.Println("toast:", err)
	}
}

func openURL(url string) {
	if url != "" {
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	}
}

// makeIcon draws a filled circle and wraps it as a PNG-in-ICO, which the
// Windows tray accepts, so no icon asset has to ship with the exe.
func makeIcon(c color.RGBA) []byte {
	const size = 32
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx, dy := float64(x)-15.5, float64(y)-15.5
			if dx*dx+dy*dy <= 14*14 {
				img.Set(x, y, c)
			}
		}
	}
	var p bytes.Buffer
	_ = png.Encode(&p, img)
	var ico bytes.Buffer
	_ = binary.Write(&ico, binary.LittleEndian, []uint16{0, 1, 1})
	ico.Write([]byte{size, size, 0, 0})
	_ = binary.Write(&ico, binary.LittleEndian, []uint16{1, 32})
	_ = binary.Write(&ico, binary.LittleEndian, uint32(p.Len()))
	_ = binary.Write(&ico, binary.LittleEndian, uint32(22))
	ico.Write(p.Bytes())
	return ico.Bytes()
}
