import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Button } from './ui'

/** Paper navigation bar, 1px bottom divider, 14px nav links. */
export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/orgs" className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-carbon">
            <span className="h-2 w-2 rounded-[2px] bg-white" />
          </span>
          <span className="text-body-strong leading-body-strong">Trackr</span>
        </Link>

        <div className="flex items-center gap-4">
          <NavLink
            to="/orgs"
            className={({ isActive }) =>
              `text-nav leading-nav transition-colors hover:text-electric-blue ${
                isActive ? 'text-carbon' : 'text-steel'
              }`
            }
          >
            Orgs
          </NavLink>
          {user && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `text-nav leading-nav transition-colors hover:text-electric-blue ${
                  isActive ? 'text-carbon' : 'text-steel'
                }`
              }
            >
              {user.username}
            </NavLink>
          )}
          <Button
            variant="outline"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Log out
          </Button>
        </div>
      </nav>
    </header>
  )
}
