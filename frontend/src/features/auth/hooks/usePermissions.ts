import { useAuth } from '@/features/auth/contexts/AuthContext'

/**
 * Who is signed in and what they may do.
 *
 * A "technical" user is a full staff account: it can create and update
 * everything an admin can, and is barred only from deleting. The server
 * enforces that in AuthMiddleware regardless of what the UI shows -- this hook
 * exists so we don't render buttons that are guaranteed to 403.
 */
export function usePermissions() {
  const { admin } = useAuth()
  const role = admin?.role ?? 'admin'

  return {
    role,
    isAdmin: role === 'admin',
    isTechnical: role === 'technical',
    /** Technical users may not delete anything. */
    canDelete: role === 'admin',
    /** Only full admins manage staff accounts. */
    canManageStaff: role === 'admin',
  }
}
