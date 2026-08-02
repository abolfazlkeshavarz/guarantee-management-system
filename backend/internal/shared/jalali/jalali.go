// Package jalali converts Gregorian dates to the Jalali (Solar Hijri) calendar.
//
// This is a direct port of the algorithm used by the "jalaali-js" npm package
// (based on Kazimierz Borkowski's method), which the frontend already uses via
// frontend/src/lib/calendar.ts. Porting the exact same algorithm keeps the
// backend and frontend in agreement about "today's" Jalali date.
package jalali

import "time"

func div(a, b int) int {
	return a / b
}

func mod(a, b int) int {
	return a - (a/b)*b
}

// breaks are the years (Jalali) at which the 33-year leap cycle resets;
// see https://jalaali.github.io/jalaali-js/ for the reference table.
var breaks = []int{-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178}

type jalCalResult struct {
	leap  int
	gy    int
	march int
}

func jalCal(jy int) jalCalResult {
	gy := jy + 621
	leapJ := -14
	jp := breaks[0]

	var jm, jump int
	n := 0

	for i := 1; i < len(breaks); i++ {
		jm = breaks[i]
		jump = jm - jp
		if jy < jm {
			break
		}
		leapJ = leapJ + div(jump, 33)*8 + div(mod(jump, 33), 4)
		jp = jm
	}
	n = jy - jp

	leapJ = leapJ + div(n, 33)*8 + div(mod(n, 33)+3, 4)
	if mod(jump, 33) == 4 && jump-n == 4 {
		leapJ++
	}

	leapG := div(gy, 4) - div((div(gy, 100)+1)*3, 4) - 150
	march := 20 + leapJ - leapG

	if jump-n < 6 {
		n = n - jump + div(jump, 33)*33
	}
	leap := mod(mod(n+1, 33)-1, 4)
	if leap == -1 {
		leap = 4
	}

	return jalCalResult{leap: leap, gy: gy, march: march}
}

func g2d(gy, gm, gd int) int {
	d := div((gy+div(gm-8, 6)+100100)*1461, 4) +
		div(153*mod(gm+9, 12)+2, 5) +
		gd - 34840408
	d = d - div(div(gy+100100+div(gm-8, 6), 100)*3, 4) + 752
	return d
}

func d2g(jdn int) (gy, gm, gd int) {
	j := 4*jdn + 139361631
	j = j + div(div(4*jdn+183187720, 146097)*3, 4)*4 - 3908
	i := div(mod(j, 1461), 4)*5 + 308
	gd = div(mod(i, 153), 5) + 1
	gm = mod(div(i, 153), 12) + 1
	gy = div(j, 1461) - 100100 + div(8-gm, 6)
	return
}

func d2j(jdn int) (jy, jm, jd int) {
	gy, _, _ := d2g(jdn)
	jy = gy - 621
	r := jalCal(jy)
	jdn1f := g2d(r.gy, 3, r.march)

	k := jdn - jdn1f
	if k >= 0 {
		if k <= 185 {
			jm = 1 + div(k, 31)
			jd = mod(k, 31) + 1
			return
		}
		k -= 186
	} else {
		jy--
		k += 179
		if r.leap == 1 {
			k++
		}
	}
	jm = 7 + div(k, 30)
	jd = mod(k, 30) + 1
	return
}

// FromGregorian converts a Gregorian (year, month, day) to its Jalali equivalent.
func FromGregorian(gy, gm, gd int) (jy, jm, jd int) {
	return d2j(g2d(gy, gm, gd))
}

// FromTime converts a time.Time (interpreted in its own location) to its Jalali date.
func FromTime(t time.Time) (jy, jm, jd int) {
	return FromGregorian(t.Year(), int(t.Month()), t.Day())
}

// Today returns the current Jalali date.
func Today() (jy, jm, jd int) {
	return FromTime(time.Now())
}
