// Cliente API para comunicarse con el backend
import type { User, Trip, Reservation, Experience, Location } from '@/types'

// Obtener API URL de las variables de entorno
// Detecta automáticamente si está en localhost o en la red
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  const hostname = window.location.hostname
  
  // En desarrollo, detectar correctamente la URL del backend
  if (import.meta.env.DEV) {
    // Si estamos en localhost, usar localhost:3000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'
    }
    
    // Si estamos accediendo desde la IP del servidor (72.60.136.211 o cualquier IP), usar esa IP con puerto 3000
    // Esto cubre el caso cuando se accede desde http://72.60.136.211:5174
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${hostname}:3000/api`
    }
    
    // Si la URL del env contiene lumo.peranto.app pero estamos en desarrollo, usar la IP del servidor
    if (envUrl && envUrl.includes('lumo.peranto.app')) {
      return `http://${hostname}:3000/api`
    }
  }
  
  if (envUrl && envUrl !== 'undefined') {
    // Forzar HTTP si la URL es HTTPS (para evitar errores de certificado)
    let finalUrl = envUrl
    if (finalUrl.startsWith('https://')) {
      finalUrl = finalUrl.replace('https://', 'http://')
    }
    
    // Si la URL del env usa localhost pero estamos accediendo desde la red, usar la IP del servidor
    if (finalUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const serverIP = hostname
      return finalUrl.replace('localhost', serverIP)
    }
    
    // Si la URL contiene lumo.peranto.app pero estamos en desarrollo desde la IP, usar la IP
    if (import.meta.env.DEV && finalUrl.includes('lumo.peranto.app') && hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${hostname}:3000/api`
    }
    
    return finalUrl
  }
  
  // Fallback: detectar automáticamente
  if (import.meta.env.DEV) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'
    } else if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // IP del servidor
      return `http://${hostname}:3000/api`
    } else {
      // Dominio, usar puerto 3000
      return `http://${hostname}:3000/api`
    }
  }
  
  // Fallback para producción
  return '/api'
}

let API_URL = getApiUrl()

// FORZAR HTTP en desarrollo si detectamos HTTPS
if (import.meta.env.DEV && API_URL.startsWith('https://')) {
  console.warn('⚠️ Detectado HTTPS en desarrollo, forzando HTTP:', API_URL)
  API_URL = API_URL.replace('https://', 'http://')
}

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🔗 API URL final:', API_URL)
  console.log('🌐 Frontend hostname:', window.location.hostname)
  console.log('🌐 Frontend origin:', window.location.origin)
  console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL)
  console.log('📦 DEV mode:', import.meta.env.DEV)
  console.log('🔍 IP detectada:', window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'Sí' : 'No')
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.loadToken()
  }

  private loadToken() {
    this.token = localStorage.getItem('token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.loadToken()
    
    // Asegurar que la URL base siempre use HTTP en desarrollo
    let baseURL = this.baseURL
    if (import.meta.env.DEV && baseURL.startsWith('https://')) {
      baseURL = baseURL.replace('https://', 'http://')
      console.warn('⚠️ Forzando HTTP en request:', baseURL)
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const fullUrl = `${baseURL}${endpoint}`
    if (import.meta.env.DEV) {
      console.log('📡 Request:', fullUrl)
    }

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorData: any
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: `HTTP error! status: ${response.status}` }
      }
      
      // Crear un error con más información para debugging
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`)
      ;(error as any).response = { data: errorData, status: response.status }
      throw error
    }

    return response.json()
  }

  // Métodos HTTP genéricos
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  // Trips (Pasajeros)
  // Pricing
  async calculatePrice(distance: number, country: string, vehicleType?: string): Promise<{
    basePrice: number
    distancePrice: number
    timePrice: number
    totalPrice: number
    currency: string
  }> {
    return this.request('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ distance, country, vehicleType }),
    })
  }

  async getCountryCurrency(country: string): Promise<{ currency: string; country: string }> {
    return this.request(`/pricing/currency?country=${encodeURIComponent(country)}`)
  }

  async createTrip(tripData: {
    originAddress: string
    originLatitude: number
    originLongitude: number
    destinationAddress: string
    destinationLatitude: number
    destinationLongitude: number
    originPlaceId?: string
    destinationPlaceId?: string
    scheduledAt?: string
    returnScheduledAt?: string
    passengers?: number
    isRoundTrip?: boolean
    preferredVehicleType?: string
    distance: number
    duration: number
    distanceText: string
    durationText: string
    basePrice: number
    distancePrice: number
    timePrice: number
    totalPrice: number
    currency?: string
    routePolyline?: string
    routeBounds?: any
  }) {
    return this.request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    })
  }

  async getTrips(status?: string) {
    const params = status ? `?status=${status}` : ''
    return this.request<Trip[]>(`/trips${params}`)
  }

  async getTrip(id: string) {
    return this.request<Trip>(`/trips/${id}`)
  }

  async renewStartPin(tripId: string) {
    return this.request<{ startPin: string; startPinExpiresAt: string; startQrCode: string }>(`/trips/${tripId}/renew-pin`, {
      method: 'POST',
    })
  }

  async cancelTrip(id: string) {
    return this.request<Trip>(`/trips/${id}/cancel`, {
      method: 'PATCH',
    })
  }

  // Experiences (Experiencias)
  async getExperiences(filters?: { status?: string; hostId?: string }) {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.hostId) params.append('hostId', filters.hostId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<Experience[]>(`/experiences${query}`)
  }

  async getExperience(id: string) {
    return this.request<Experience>(`/experiences/${id}`)
  }

  // Reservations
  async createReservation(reservationData: {
    experienceId: string
    startDate: string
    endDate: string
    participants: number
  }) {
    return this.request<Reservation>('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    })
  }

  async getReservations(status?: string) {
    const params = status ? `?status=${status}` : ''
    return this.request<Reservation[]>(`/reservations${params}`)
  }

  // Locations (Favoritos)
  async getSavedLocations() {
    return this.request<Location[]>('/locations')
  }

  async saveLocation(locationData: {
    name: string
    address: string
    latitude: number
    longitude: number
    placeId?: string
  }) {
    return this.request<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(locationData),
    })
  }

  async deleteLocation(id: string) {
    return this.request<void>(`/locations/${id}`, {
      method: 'DELETE',
    })
  }

  // Admin
  async getAdminStats() {
    return this.request<{
      totalUsers: number
      activeUsers: number
      totalTrips: number
      activeTrips: number
      completedTrips: number
      pendingTrips: number
      cancelledTrips: number
      inProgressTrips: number
      totalRevenue: number
      currency: string
      usersByRole: { role: string; count: number }[]
      tripsByStatus: { status: string; count: number }[]
      recentUsers: number
      recentTrips: number
    }>('/admin/stats')
  }

  // Admin - Users
  async getUsers(options?: {
    page?: number
    limit?: number
    role?: string
    isActive?: boolean
    search?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.role) params.append('role', options.role)
    if (options?.isActive !== undefined) params.append('isActive', options.isActive.toString())
    if (options?.search) params.append('search', options.search)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{
      users: User[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/admin/users${query}`)
  }

  async getUser(id: string) {
    return this.request<User>(`/admin/users/${id}`)
  }

  async createUser(userData: {
    email: string
    name: string
    phone?: string
    password?: string
    role?: string
    preferredCurrency?: string
    avatar?: string
  }) {
    return this.request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(id: string, userData: {
    name?: string
    phone?: string
    role?: string
    preferredCurrency?: string
    isActive?: boolean
    isVerified?: boolean
    isEmailVerified?: boolean
    avatar?: string
    password?: string
  }) {
    return this.request<User>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  }

  async changeUserRole(id: string, role: string) {
    return this.request<User>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    return this.request<User>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    })
  }

  // Gestión de roles múltiples
  async getUserRoles(userId: string) {
    return this.request<{ roles: string[] }>(`/admin/users/${userId}/roles`)
  }

  async addUserRole(userId: string, role: string) {
    return this.request<{ message: string; roles: string[] }>(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
  }

  async removeUserRole(userId: string, role: string) {
    return this.request<{ message: string; roles: string[] }>(`/admin/users/${userId}/roles/${role}`, {
      method: 'DELETE',
    })
  }

  async setUserRoles(userId: string, roles: string[]) {
    return this.request<{ message: string; roles: string[] }>(`/admin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    })
  }

  /**
   * Obtiene la información del usuario autenticado
   */
  async getProfile() {
    return this.request<{ user: User }>('/auth/me').then(res => res.user)
  }

  /**
   * Actualiza la información del usuario autenticado
   */
  async changeActiveRole(role: string) {
    return this.request<{ user: User }>('/auth/me/active-role', {
      method: 'PATCH',
      body: JSON.stringify({ role })
    })
  }

  async updateProfile(userData: {
    name?: string
    phone?: string
    preferredCurrency?: string
    country?: string
    avatar?: string
  }) {
    return this.request<{ user: User }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }).then(res => res.user)
  }

  async deleteAccount() {
    return this.request<{ message: string }>('/auth/me', {
      method: 'DELETE',
    })
  }

  // Admin - Trips
  async getAdminTrips(options?: {
    page?: number
    limit?: number
    status?: string
    passengerId?: string
    driverId?: string
    search?: string
    startDate?: string
    endDate?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.passengerId) params.append('passengerId', options.passengerId)
    if (options?.driverId) params.append('driverId', options.driverId)
    if (options?.search) params.append('search', options.search)
    if (options?.startDate) params.append('startDate', options.startDate)
    if (options?.endDate) params.append('endDate', options.endDate)

    const queryString = params.toString()
    return this.request<{
      trips: Trip[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/admin/trips${queryString ? `?${queryString}` : ''}`)
  }

  async getAdminTrip(id: string) {
    return this.request<Trip>(`/admin/trips/${id}`)
  }

  async updateTripStatus(id: string, status: string) {
    return this.request<Trip>(`/admin/trips/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async assignDriverToTrip(id: string, driverId: string, vehicleId?: string, allowReassign: boolean = false) {
    const params = allowReassign ? '?allowReassign=true' : ''
    return this.request<Trip>(`/admin/trips/${id}/assign-driver${params}`, {
      method: 'PATCH',
      body: JSON.stringify({ driverId, vehicleId }),
    })
  }

  async cancelAdminTrip(id: string, reason?: string) {
    return this.request<Trip>(`/admin/trips/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  }

  async getAvailableDrivers(tripCountry?: string) {
    const params = tripCountry ? `?country=${encodeURIComponent(tripCountry)}` : ''
    return this.request<Array<{
      id: string
      name: string
      email: string
      phone?: string | null
      avatar?: string | null
      vehicles: Array<{
        id: string
        make: string
        model: string
        licensePlate: string
        type: string
      }>
    }>>(`/admin/drivers${params}`)
  }

  async getDriverVehicles(driverId: string) {
    return this.request<Array<{
      id: string
      make: string
      model: string
      year: number
      licensePlate: string
      color?: string | null
      type: string
      capacity: number
    }>>(`/admin/drivers/${driverId}/vehicles`)
  }

  // Métodos para conductores
  async getAvailableTrips(options?: {
    page?: number
    limit?: number
    vehicleType?: string
    maxDistance?: number
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.vehicleType) params.append('vehicleType', options.vehicleType)
    if (options?.maxDistance) params.append('maxDistance', options.maxDistance.toString())

    const queryString = params.toString()
    return this.request<{
      trips: Trip[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/driver/trips/available${queryString ? `?${queryString}` : ''}`)
  }

  async getDriverTrips(options?: {
    page?: number
    limit?: number
    status?: string | string[]
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status]
      statuses.forEach(s => params.append('status', s))
    }

    const queryString = params.toString()
    return this.request<{
      trips: Trip[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/driver/trips${queryString ? `?${queryString}` : ''}`)
  }

  async getDriverTrip(tripId: string) {
    return this.request<Trip>(`/driver/trips/${tripId}`)
  }

  async acceptTrip(tripId: string, vehicleId?: string) {
    return this.request<Trip>(`/driver/trips/${tripId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
    })
  }

  async rejectTrip(tripId: string, reason?: string) {
    return this.request<{ success: boolean }>(`/driver/trips/${tripId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async startTrip(tripId: string, options: {
    pin?: string
    qrCode?: string
    driverLatitude?: number
    driverLongitude?: number
  }) {
    return this.request<Trip>(`/driver/trips/${tripId}/start`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  async completeTrip(tripId: string, options?: {
    driverLatitude?: number
    driverLongitude?: number
  }) {
    return this.request<Trip>(`/driver/trips/${tripId}/complete`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    })
  }

  // Notificaciones
  async getNotifications(options?: {
    page?: number
    limit?: number
    status?: string
    type?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.type) params.append('type', options.type)

    const queryString = params.toString()
    return this.request<{
      notifications: Array<{
        id: string
        type: string
        title: string
        message: string
        priority: string
        status: string
        data?: any
        actionUrl?: string
        actionLabel?: string
        createdAt: string
        readAt?: string
      }>
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/notifications${queryString ? `?${queryString}` : ''}`)
  }

  async getUnreadNotificationCount() {
    return this.request<{ count: number }>('/notifications/unread-count')
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    })
  }

  async archiveNotification(notificationId: string) {
    return this.request(`/notifications/${notificationId}/archive`, {
      method: 'PATCH',
    })
  }

  // Alertas para conductores
  async getDriverAlerts(options?: {
    status?: string
    includeExpired?: boolean
  }) {
    const params = new URLSearchParams()
    if (options?.status) params.append('status', options.status)
    if (options?.includeExpired) params.append('includeExpired', 'true')

    const queryString = params.toString()
    return this.request<{
      alerts: Array<{
        id: string
        tripId: string
        status: string
        expiresAt: string
        acceptedAt?: string
        rejectedAt?: string
        viewedAt?: string
        createdAt: string
        trip: Trip
      }>
    }>(`/driver/alerts${queryString ? `?${queryString}` : ''}`)
  }

  async acceptTripFromAlert(alertId: string, vehicleId?: string) {
    return this.request<{ success: boolean; trip: Trip }>(`/driver/alerts/${alertId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
    })
  }

  async rejectTripFromAlert(alertId: string, reason?: string) {
    return this.request<{ success: boolean }>(`/driver/alerts/${alertId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  async markAlertAsViewed(alertId: string) {
    return this.request(`/driver/alerts/${alertId}/view`, {
      method: 'PATCH',
    })
  }

  // Gestión de vehículos del conductor
  async getMyVehicles() {
    return this.request<Array<import('@/types').Vehicle>>('/driver/vehicles')
  }

  async getMyVehicle(vehicleId: string) {
    return this.request<import('@/types').Vehicle>(`/driver/vehicles/${vehicleId}`)
  }

  async createVehicle(data: {
    make: string
    model: string
    year: number
    color?: string
    licensePlate: string
    type: string
    capacity: number
    photos?: string[]
  }) {
    return this.request<import('@/types').Vehicle>('/driver/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateVehicle(vehicleId: string, data: {
    make?: string
    model?: string
    year?: number
    color?: string
    licensePlate?: string
    type?: string
    capacity?: number
    isAvailable?: boolean
    photos?: string[]
  }) {
    return this.request<import('@/types').Vehicle>(`/driver/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteVehicle(vehicleId: string) {
    return this.request(`/driver/vehicles/${vehicleId}`, {
      method: 'DELETE',
    })
  }

  // Gestión de vehículos para administradores
  async getAdminVehicles(options?: {
    page?: number
    limit?: number
    approvalStatus?: string
    driverId?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.approvalStatus) params.append('approvalStatus', options.approvalStatus)
    if (options?.driverId) params.append('driverId', options.driverId)

    const queryString = params.toString()
    return this.request<{
      vehicles: Array<import('@/types').Vehicle>
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/admin/vehicles${queryString ? `?${queryString}` : ''}`)
  }

  async getAdminVehicle(vehicleId: string) {
    return this.request<import('@/types').Vehicle>(`/admin/vehicles/${vehicleId}`)
  }

  async approveVehicle(vehicleId: string) {
    return this.request<import('@/types').Vehicle>(`/admin/vehicles/${vehicleId}/approve`, {
      method: 'POST',
    })
  }

  async rejectVehicle(vehicleId: string, reason?: string) {
    return this.request<import('@/types').Vehicle>(`/admin/vehicles/${vehicleId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // Onboarding de conductores
  async getOnboardingStatus() {
    return this.request<import('@/types').DriverOnboarding>('/onboarding')
  }

  async startOnboarding(data: {
    fullName?: string
    dateOfBirth?: string
    nationalId?: string
    address?: string
    city?: string
    country?: string
  }) {
    return this.request<import('@/types').DriverOnboarding>('/onboarding/start', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOnboarding(data: {
    fullName?: string
    dateOfBirth?: string
    nationalId?: string
    address?: string
    city?: string
    country?: string
    licenseNumber?: string
    licenseExpiryDate?: string
    licenseIssuedBy?: string
    bankName?: string
    accountNumber?: string
    accountType?: string
    routingNumber?: string
    currentStep?: number
  }) {
    return this.request<import('@/types').DriverOnboarding>('/onboarding', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async uploadDocument(data: {
    type: string
    fileName: string
    fileUrl: string
    fileSize?: number
    mimeType?: string
  }) {
    return this.request<import('@/types').DriverDocument>('/onboarding/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteDocument(documentId: string) {
    return this.request(`/onboarding/documents/${documentId}`, {
      method: 'DELETE',
    })
  }

  async linkVehicleToOnboarding(vehicleId: string) {
    return this.request<import('@/types').DriverOnboarding>('/onboarding/vehicle', {
      method: 'POST',
      body: JSON.stringify({ vehicleId }),
    })
  }

  async completeOnboarding() {
    return this.request<import('@/types').DriverOnboarding>('/onboarding/complete', {
      method: 'POST',
    })
  }

  // Polkadot Wallet
  async getWalletInfo() {
    return this.request<{
      hasWallet: boolean
      address?: string
      chain?: string
      balance?: string
      peopleChainIdentity?: string
    }>('/polkadot/auth/wallet-info')
  }

  async linkWallet(address: string, chain: string, signature: string, message: string) {
    return this.request<{ user: User }>('/polkadot/auth/link-wallet', {
      method: 'POST',
      body: JSON.stringify({ address, chain, signature, message }),
    })
  }

  async unlinkWallet() {
    return this.request<{ message: string }>('/polkadot/auth/unlink-wallet', {
      method: 'DELETE',
    })
  }

  // Emergency Services
  async createEmergency(data: {
    emergencyType: string
    severity?: string
    latitude: number
    longitude: number
    address?: string
    city?: string
    country?: string
    placeId?: string
    title: string
    description: string
    numberOfPeople?: number
    tripId?: string
    experienceId?: string
    metadata?: any
  }) {
    return this.request<any>('/emergencies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEmergencies(options?: {
    page?: number
    limit?: number
    status?: string
    emergencyType?: string
    severity?: string
    latitude?: number
    longitude?: number
    radiusKm?: number
    search?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.emergencyType) params.append('emergencyType', options.emergencyType)
    if (options?.severity) params.append('severity', options.severity)
    if (options?.latitude) params.append('latitude', options.latitude.toString())
    if (options?.longitude) params.append('longitude', options.longitude.toString())
    if (options?.radiusKm) params.append('radiusKm', options.radiusKm.toString())
    if (options?.search) params.append('search', options.search)

    const query = params.toString()
    return this.request<{
      emergencies: any[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/emergencies${query ? `?${query}` : ''}`)
  }

  async getNearbyEmergencies(latitude: number, longitude: number, radiusKm: number = 10, options?: {
    page?: number
    limit?: number
    status?: string
    emergencyType?: string
    severity?: string
  }) {
    const params = new URLSearchParams()
    params.append('latitude', latitude.toString())
    params.append('longitude', longitude.toString())
    params.append('radiusKm', radiusKm.toString())
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.emergencyType) params.append('emergencyType', options.emergencyType)
    if (options?.severity) params.append('severity', options.severity)

    return this.request<{
      emergencies: any[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/emergencies/nearby?${params.toString()}`)
  }

  async getEmergency(emergencyId: string) {
    return this.request<any>(`/emergencies/${emergencyId}`)
  }

  async updateEmergencyStatus(
    emergencyId: string,
    data: {
      status: string
      servicesResponded?: any
      resolution?: string
      metadata?: any
    }
  ) {
    return this.request<any>(`/emergencies/${emergencyId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async resolveEmergency(emergencyId: string, resolution: string, servicesResponded?: any) {
    return this.request<any>(`/emergencies/${emergencyId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, servicesResponded }),
    })
  }

  async cancelEmergency(emergencyId: string, resolution?: string) {
    return this.request<any>(`/emergencies/${emergencyId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    })
  }

  async createEmergencyAsAuthority(data: {
    emergencyType: string
    severity?: string
    latitude: number
    longitude: number
    address?: string
    city?: string
    country?: string
    placeId?: string
    title: string
    description: string
    numberOfPeople?: number
    tripId?: string
    experienceId?: string
    metadata?: any
  }) {
    return this.request<any>('/emergencies/authority', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePrivacySettings(settings: {
    showDisplayName?: boolean
    showLegalName?: boolean
    showEmail?: boolean
    showWeb?: boolean
    showTwitter?: boolean
    showRiot?: boolean
    showJudgements?: boolean
    preferredName?: string
  }) {
    return this.request<User>('/polkadot/auth/privacy-settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  }

  // Polkadot Payments
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    return this.request<{
      amount: number
      fromCurrency: string
      toCurrency: string
      rate: number
    }>(`/polkadot/payments/convert?amount=${amount}&fromCurrency=${encodeURIComponent(fromCurrency)}&toCurrency=${encodeURIComponent(toCurrency)}`)
  }

  async getPolkadotPayments(options?: {
    page?: number
    limit?: number
    status?: string
    tripId?: string
  }) {
    const params = new URLSearchParams()
    if (options?.page) params.append('page', options.page.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.tripId) params.append('tripId', options.tripId)
    const query = params.toString()
    return this.request<any[]>(`/polkadot/payments${query ? `?${query}` : ''}`)
  }

  async getPolkadotPayment(paymentId: string) {
    return this.request<any>(`/polkadot/payments/${paymentId}`)
  }

  async generatePaymentExtrinsic(paymentId: string) {
    return this.request<{
      method: string
      params: any[]
      chain: string
      assetId: number | null
      amount: string
      driverAmount: string
      platformAmount: string
      toAddress: string
      platformAddress: string
      decimals: number
      currency: string
      isBatch: boolean
    }>(`/polkadot/payments/${paymentId}/generate-extrinsic`, {
      method: 'POST',
    })
  }

  async processPayment(
    paymentId: string,
    txHash: string,
    chain: string,
    blockNumber?: string
  ) {
    return this.post<{
      payment: any
      message: string
    }>('/polkadot/payments/process', {
      paymentId,
      txHash,
      chain,
      blockNumber,
    })
  }

  async getPaymentQrCode(paymentId: string) {
    return this.request<{
      qrCode: string
      paymentId: string
      address: string
      amount: string
      currency: string
    }>(`/polkadot/payments/${paymentId}/qr-code`, {
      method: 'GET',
    })
  }

  // Emergency Blockchain Decoder (solo autoridades)
  async decodeEmergencyFromTxHash(txHash: string, chain?: string) {
    return this.request<{
      emergency: {
        emergencyId: string
        reporter: string
        emergencyType: string
        severity: string
        latitude: number
        longitude: number
        timestamp: number
        title?: string
        description?: string
        numberOfPeople?: number
        address?: string
        city?: string
        country?: string
        blockNumber: string
        blockHash: string
        txHash: string
        rawData: any
      }
    }>(`/emergency-blockchain/decode/${txHash}${chain ? `?chain=${chain}` : ''}`)
  }

  async decodeEmergenciesFromBlock(blockNumber: number, chain?: string) {
    return this.request<{
      blockNumber: number
      chain: string
      emergencies: Array<{
        emergencyId: string
        reporter: string
        emergencyType: string
        severity: string
        latitude: number
        longitude: number
        timestamp: number
        title?: string
        description?: string
        numberOfPeople?: number
        address?: string
        city?: string
        country?: string
        blockNumber: string
        blockHash: string
        txHash: string
        rawData: any
      }>
      count: number
    }>(`/emergency-blockchain/block/${blockNumber}${chain ? `?chain=${chain}` : ''}`)
  }

  async searchEmergenciesInRange(fromBlock: number, toBlock: number, chain?: string) {
    return this.request<{
      fromBlock: number
      toBlock: number
      chain: string
      emergencies: Array<any>
      count: number
    }>(`/emergency-blockchain/range?fromBlock=${fromBlock}&toBlock=${toBlock}${chain ? `&chain=${chain}` : ''}`)
  }

  async getRecentEmergencies(lastNBlocks?: number, chain?: string) {
    return this.request<{
      lastNBlocks: number
      chain: string
      emergencies: Array<any>
      count: number
    }>(`/emergency-blockchain/recent?lastNBlocks=${lastNBlocks || 100}${chain ? `&chain=${chain}` : ''}`)
  }

  // People Chain
  async getPeopleChainIdentity(address: string) {
    return this.request<{
      hasIdentity: boolean
      displayName?: string
      legalName?: string
      email?: string
      web?: string
      twitter?: string
      riot?: string
      judgements?: any[]
      deposit?: string
    }>(`/polkadot/people-chain/identity/${address}`)
  }

  async getPeopleChainFullIdentity(address: string) {
    return this.request<{
      hasIdentity: boolean
      displayName?: string
      legalName?: string
      email?: string
      web?: string
      twitter?: string
      riot?: string
      judgements?: any[]
      deposit?: string
      isVerified?: boolean
    }>(`/polkadot/people-chain/identity/${address}/full`)
  }

  async verifyPeopleChainIdentity(address: string) {
    return this.request<{
      address: string
      verified: boolean
    }>(`/polkadot/people-chain/identity/${address}/verified`)
  }

  async getPeopleChainDisplayName(address: string) {
    return this.request<{
      address: string
      displayName: string | null
    }>(`/polkadot/people-chain/identity/${address}/display-name`)
  }

  async getPeopleChainRegistrationInfo() {
    return this.request<{
      basicDeposit: string
      fieldDeposit: string
      subAccountDeposit: string
    }>('/polkadot/people-chain/registration-info')
  }

  async getPeopleChainRegistrars() {
    return this.request<{
      registrars: Array<{
        account: string
        fee: string
        fields: any
      }>
      count: number
      }>('/polkadot/people-chain/registrars')
  }

  // Admin - Polkadot Config (solo lectura pública)
  async getPolkadotConfig() {
    // Intentar primero el endpoint público, si falla usar el de admin
    try {
      return await this.request<{
        network: string
        paymentChain: string
        paymentPreset: string
        paymentCustom: string | null
        assetUsdtId: string | null
        assetUsdcId: string | null
        platformAddress: string | null
        platformFeePercentage: number | null
      }>('/polkadot/config')
    } catch (error: any) {
      // Fallback al endpoint de admin si el usuario es admin
      if (error.status === 403) {
        return await this.request<{
          network: string
          paymentChain: string
          paymentPreset: string
          paymentCustom: string | null
          assetUsdtId: string | null
          assetUsdcId: string | null
          platformAddress: string | null
          platformFeePercentage: number | null
        }>('/admin/config/polkadot')
      }
      throw error
    }
  }

  async updatePolkadotConfig(configs: {
    network?: string
    paymentChain?: string
    paymentPreset?: string
    paymentCustom?: string | null
    assetUsdtId?: string | null
    assetUsdcId?: string | null
    platformAddress?: string | null
    platformFeePercentage?: number | null
  }) {
    return this.request<{
      message: string
      configs: any
    }>('/admin/config/polkadot', {
      method: 'PUT',
      body: JSON.stringify(configs),
    })
  }

  // System Config
  async getSystemConfig() {
    return this.request<{
      validations: {
        distanceStartTrip: boolean
        distanceEndTrip: boolean
      }
      polkadot: any
    }>('/system-config')
  }

  async getValidationConfigs() {
    return this.request<{
      distanceStartTrip: boolean
      distanceEndTrip: boolean
    }>('/system-config/validations')
  }

  async updateValidationConfigs(configs: {
    distanceStartTrip?: boolean
    distanceEndTrip?: boolean
  }) {
    return this.request<{
      message: string
      validations: {
        distanceStartTrip: boolean
        distanceEndTrip: boolean
      }
    }>('/system-config/validations', {
      method: 'PUT',
      body: JSON.stringify(configs),
    })
  }

  async uploadFile(file: File, folder?: string): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
    this.loadToken()
    
    const formData = new FormData()
    formData.append('file', file)
    if (folder) {
      formData.append('folder', folder)
    }

    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Onboarding para administradores
  async getPendingOnboardings() {
    return this.request<Array<import('@/types').DriverOnboarding>>('/onboarding/pending')
  }

  async approveOnboarding(onboardingId: string) {
    return this.request<import('@/types').DriverOnboarding>(`/onboarding/${onboardingId}/approve`, {
      method: 'POST',
    })
  }

  async rejectOnboarding(onboardingId: string, reason: string) {
    return this.request<import('@/types').DriverOnboarding>(`/onboarding/${onboardingId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }
}

export const api = new ApiClient(API_URL)

