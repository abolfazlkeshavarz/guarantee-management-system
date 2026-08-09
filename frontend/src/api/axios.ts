import axios from 'axios'

// Relative by default so the same build works behind nginx in production and
// through the Vite dev proxy locally. Set VITE_API_URL only for a split-domain
// deployment where the API lives on another host.
const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const ADMIN_TOKEN_KEY = 'token'
const TECH_TOKEN_KEY = 'tech_token'

function currentToken(): string | null {
  // Technicians and admins never share a browser session, so whichever token
  // is present is the active one.
  return localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(TECH_TOKEN_KEY)
}

api.interceptors.request.use(
  (config) => {
    const token = currentToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const path = window.location.pathname
    const onLoginScreen = path.includes('/login')

    if (status === 401 && !onLoginScreen) {
      const wasTechnician = !!localStorage.getItem(TECH_TOKEN_KEY)
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem(TECH_TOKEN_KEY)
      delete api.defaults.headers.common.Authorization

      // Send technicians back to their own sign-in page rather than the
      // staff screen, which previously dropped them on the wrong form.
      window.location.href = wasTechnician ? '/technician/login' : '/login'
    }

    return Promise.reject(error)
  }
)
