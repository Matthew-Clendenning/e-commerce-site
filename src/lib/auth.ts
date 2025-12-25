import { auth, currentUser } from '@clerk/nextjs/server'

// Check if user is authenticated
export async function requireAuth() {
    const { userId } = await auth()

    if (!userId) {
        throw new Error('Unauthorized')
    }

    return userId
}

// Check if user is an admin
export async function requireAdmin() {
    const { userId } = await auth()

    if (!userId) {
        throw new Error('Unauthorized')
    }

    const user = await currentUser()

    // Check if user has admin role
    // Clerk stores roles in publicMetadata or privateMetadata
    const isAdmin = user?.publicMetadata?.role === 'admin'

    if (!isAdmin) {
        throw new Error('Forbidden: Admin access required')
    }

    return userId
}