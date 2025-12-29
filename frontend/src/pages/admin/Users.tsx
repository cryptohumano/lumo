import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Shield, Users as UsersIcon } from 'lucide-react'
import type { User } from '@/types'
import { UserRole, Currency } from '@/types'

interface UsersListResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function Users() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [selectedRolesToAdd, setSelectedRolesToAdd] = useState<UserRole[]>([])
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    role: 'PASSENGER' as UserRole,
    preferredCurrency: 'CLP' as Currency,
  })

  useEffect(() => {
    // Verificar si el usuario tiene rol ADMIN activo (soporta múltiples roles)
    const currentRole = currentUser?.activeRole || currentUser?.role
    const currentUserRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])
    if (!currentUser || (currentRole !== UserRole.ADMIN && !currentUserRoles.includes(UserRole.ADMIN))) {
      navigate('/')
      return
    }
    loadUsers()
  }, [currentUser, navigate, page, roleFilter, statusFilter, search])

  // Agregar las funciones que faltan
  const handleOpenRolesDialog = async (user: User) => {
    setSelectedUser(user)
    setIsRolesDialogOpen(true)
    setIsLoadingRoles(true)
    setSelectedRolesToAdd([]) // Resetear selección
    try {
      const response = await api.getUserRoles(user.id)
      const roles = response.roles as UserRole[]
      setUserRoles(roles)
      console.log('Roles cargados:', roles)
      console.log('Roles disponibles para agregar:', Object.values(UserRole).filter(role => !roles.includes(role)))
    } catch (error: any) {
      console.error('Error loading roles:', error)
      toast.error('Error al cargar roles')
      // Fallback: usar el rol principal
      setUserRoles([user.role])
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const handleAddRole = async (role: UserRole) => {
    if (!selectedUser) return
    try {
      await api.addUserRole(selectedUser.id, role)
      toast.success('Rol agregado correctamente')
      // Recargar roles
      const response = await api.getUserRoles(selectedUser.id)
      setUserRoles(response.roles as UserRole[])
      loadUsers() // Recargar lista de usuarios
    } catch (error: any) {
      console.error('Error adding role:', error)
      toast.error(error.message || 'Error al agregar rol')
    }
  }

  const handleToggleRoleSelection = (role: UserRole) => {
    setSelectedRolesToAdd(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role)
      } else {
        return [...prev, role]
      }
    })
  }

  const handleAddSelectedRoles = async () => {
    if (!selectedUser || selectedRolesToAdd.length === 0) return
    
    try {
      // Agregar todos los roles seleccionados
      const promises = selectedRolesToAdd.map(role => 
        api.addUserRole(selectedUser.id, role)
      )
      await Promise.all(promises)
      
      toast.success(`${selectedRolesToAdd.length} rol(es) agregado(s) correctamente`)
      
      // Recargar roles
      const response = await api.getUserRoles(selectedUser.id)
      setUserRoles(response.roles as UserRole[])
      setSelectedRolesToAdd([]) // Limpiar selección
      loadUsers() // Recargar lista de usuarios
    } catch (error: any) {
      console.error('Error adding roles:', error)
      toast.error(error.message || 'Error al agregar roles')
    }
  }

  const handleRemoveRole = async (role: UserRole) => {
    if (!selectedUser) return
    // No permitir remover el rol principal
    if (selectedUser.role === role) {
      toast.error('No se puede remover el rol principal. Cambia el rol principal primero.')
      return
    }
    try {
      await api.removeUserRole(selectedUser.id, role)
      toast.success('Rol removido correctamente')
      // Recargar roles
      const response = await api.getUserRoles(selectedUser.id)
      setUserRoles(response.roles as UserRole[])
      loadUsers() // Recargar lista de usuarios
    } catch (error: any) {
      console.error('Error removing role:', error)
      toast.error(error.message || 'Error al remover rol')
    }
  }

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const options: any = {
        page,
        limit: 20,
      }
      if (roleFilter !== 'all') options.role = roleFilter
      if (statusFilter !== 'all') options.isActive = statusFilter === 'active'
      if (search) options.search = search

      const data: UsersListResponse = await api.getUsers(options)
      setUsers(data.users)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadUsers()
  }

  const handleCreate = async () => {
    try {
      if (!formData.email || !formData.name) {
        toast.error('Email y nombre son requeridos')
        return
      }

      await api.createUser({
        email: formData.email,
        name: formData.name,
        phone: formData.phone || undefined,
        password: formData.password,
        role: formData.role,
        preferredCurrency: formData.preferredCurrency,
      })
      toast.success('Usuario creado exitosamente')
      setIsCreateDialogOpen(false)
      setFormData({
        email: '',
        name: '',
        phone: '',
        password: '',
        role: UserRole.PASSENGER,
        preferredCurrency: Currency.CLP,
      })
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario')
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      password: '',
      role: user.role,
      preferredCurrency: (user.preferredCurrency || 'CLP') as Currency,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedUser) return

    try {
      await api.updateUser(selectedUser.id, {
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        preferredCurrency: formData.preferredCurrency,
        password: formData.password || undefined,
      })
      toast.success('Usuario actualizado exitosamente')
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return

    try {
      await api.deleteUser(userId)
      toast.success('Usuario eliminado exitosamente')
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario')
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive)
      toast.success(`Usuario ${user.isActive ? 'desactivado' : 'activado'} exitosamente`)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  const handleChangeRole = async (user: User, newRole: UserRole) => {
    try {
      await api.changeUserRole(user.id, newRole)
      toast.success('Rol actualizado exitosamente')
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar rol')
    }
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('admin.users') || 'Gestión de Usuarios'}</h1>
          <p className="text-muted-foreground">
            {t('admin.usersDescription') || 'Gestiona usuarios del sistema'}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.createUser') || 'Crear Usuario'}
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('admin.searchUsers') || 'Buscar por email, nombre o teléfono...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.filterByRole') || 'Filtrar por rol'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allRoles') || 'Todos los roles'}</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="DRIVER">DRIVER</SelectItem>
                <SelectItem value="PASSENGER">PASSENGER</SelectItem>
                <SelectItem value="HOST">HOST</SelectItem>
                <SelectItem value="DISPATCHER">DISPATCHER</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.filterByStatus') || 'Filtrar por estado'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatuses') || 'Todos'}</SelectItem>
                <SelectItem value="active">{t('admin.active') || 'Activos'}</SelectItem>
                <SelectItem value="inactive">{t('admin.inactive') || 'Inactivos'}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              {t('common.search') || 'Buscar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.usersList') || 'Lista de Usuarios'}</CardTitle>
          <CardDescription>
            {t('admin.totalUsers') || 'Total'}: {users.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Cargando...'}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.noUsers') || 'No se encontraron usuarios'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">{t('admin.name') || 'Nombre'}</TableHead>
                          <TableHead className="min-w-[180px]">{t('admin.email') || 'Email'}</TableHead>
                          <TableHead className="min-w-[120px]">{t('admin.phone') || 'Teléfono'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.role') || 'Rol'}</TableHead>
                          <TableHead className="min-w-[120px]">{t('admin.roles') || 'Roles'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.preferredCurrency') || 'Moneda'}</TableHead>
                          <TableHead className="min-w-[100px]">{t('admin.status') || 'Estado'}</TableHead>
                          <TableHead className="text-right min-w-[120px]">{t('admin.actions') || 'Acciones'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleChangeRole(user, value as UserRole)}
                            disabled={user.isRootAdmin}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(UserRole).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {user.isRootAdmin && (
                            <Badge className="bg-purple-100 text-purple-800" title="Administrador Principal">
                              <Shield className="h-3 w-3 mr-1" />
                              Root
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('admin.mainRole') || 'Rol principal'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Mostrar todos los roles */}
                          {(user.roles || [user.role]).map((role) => (
                            <Badge 
                              key={role} 
                              variant={role === user.role ? "default" : "outline"} 
                              className="text-xs"
                              title={role === user.role ? t('admin.mainRole') || 'Rol principal' : t('admin.additionalRole') || 'Rol adicional'}
                            >
                              {role}
                              {role === user.role && ' (P)'}
                            </Badge>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRolesDialog(user)}
                            className="h-6 px-2"
                            title={t('admin.manageAdditionalRoles') || 'Gestionar roles adicionales'}
                          >
                            <UsersIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('admin.allRoles') || 'Todos los roles'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.preferredCurrency || 'CLP'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? t('admin.active') || 'Activo' : t('admin.inactive') || 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.isRootAdmin}
                            title={user.isRootAdmin ? 'No se puede desactivar el administrador principal' : ''}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4 text-red-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            disabled={user.isRootAdmin}
                            title={user.isRootAdmin ? 'No se puede eliminar el administrador principal' : ''}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('admin.page') || 'Página'} {page} {t('admin.of') || 'de'} {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('common.previous') || 'Anterior'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t('common.next') || 'Siguiente'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear usuario */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.createUser') || 'Crear Usuario'}</DialogTitle>
            <DialogDescription>
              {t('admin.createUserDescription') || 'Completa los datos para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">{t('admin.email') || 'Email'}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name">{t('admin.name') || 'Nombre'}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('admin.phone') || 'Teléfono'}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">{t('admin.password') || 'Contraseña'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">{t('admin.role') || 'Rol'}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">{t('admin.preferredCurrency') || 'Moneda Preferida'}</Label>
              <Select
                value={formData.preferredCurrency}
                onValueChange={(value) => setFormData({ ...formData, preferredCurrency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Currency).map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency} - {t(`currency.${currency}`) || currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button onClick={handleCreate}>
              {t('admin.create') || 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.editUser') || 'Editar Usuario'}</DialogTitle>
            <DialogDescription>
              {t('admin.editUserDescription') || 'Modifica los datos del usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">{t('admin.email') || 'Email'}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-name">{t('admin.name') || 'Nombre'}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">{t('admin.phone') || 'Teléfono'}</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-password">{t('admin.newPassword') || 'Nueva Contraseña (opcional)'}</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('admin.leaveEmpty') || 'Dejar vacío para no cambiar'}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">{t('admin.role') || 'Rol'}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                disabled={selectedUser?.isRootAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUser?.isRootAdmin && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('admin.rootAdminRoleProtected') || 'El rol del administrador principal no puede ser modificado'}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-currency">{t('admin.preferredCurrency') || 'Moneda Preferida'}</Label>
              <Select
                value={formData.preferredCurrency}
                onValueChange={(value) => setFormData({ ...formData, preferredCurrency: value as Currency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Currency).map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency} - {t(`currency.${currency}`) || currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button onClick={handleUpdate}>
              {t('common.save') || 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para gestionar roles múltiples */}
      <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('admin.manageRoles') || 'Gestionar Roles'} - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              {t('admin.manageRolesDescription') || 'Agrega o remueve roles adicionales para este usuario'}
            </DialogDescription>
          </DialogHeader>
          {isLoadingRoles ? (
            <div className="text-center py-4">{t('common.loading') || 'Cargando...'}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>{t('admin.currentRoles') || 'Roles actuales'}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userRoles.map((role) => (
                    <Badge
                      key={role}
                      variant={role === selectedUser?.role ? 'default' : 'secondary'}
                      className="flex items-center gap-1"
                    >
                      {role}
                      {role === selectedUser?.role && (
                        <span className="text-xs">({t('admin.mainRole') || 'Principal'})</span>
                      )}
                      {role !== selectedUser?.role && (
                        <button
                          onClick={() => handleRemoveRole(role)}
                          className="ml-1 hover:text-destructive"
                          title={t('admin.removeRole') || 'Remover rol'}
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t('admin.addRoles') || 'Agregar roles'}</Label>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/30">
                  {(() => {
                    const availableRoles = Object.values(UserRole).filter(role => !userRoles.includes(role))
                    
                    if (availableRoles.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('admin.allRolesAssigned') || 'Todos los roles están asignados'}
                        </p>
                      )
                    }
                    
                    return availableRoles.map((role) => (
                      <label
                        key={role}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRolesToAdd.includes(role)}
                          onChange={() => handleToggleRoleSelection(role)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer accent-primary"
                        />
                        <span className="text-sm font-medium group-hover:text-foreground">{role}</span>
                      </label>
                    ))
                  })()}
                </div>
                {selectedRolesToAdd.length > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedRolesToAdd.length} rol(es) seleccionado(s)
                    </span>
                    <Button
                      size="sm"
                      onClick={handleAddSelectedRoles}
                      className="flex-shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('admin.addSelectedRoles') || 'Agregar roles seleccionados'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRolesDialogOpen(false)
                setSelectedRolesToAdd([]) // Limpiar selección al cerrar
              }}
            >
              {t('common.close') || 'Cerrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

