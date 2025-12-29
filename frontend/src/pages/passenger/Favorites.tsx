import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Plus, Trash2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Location } from '@/types'

export default function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    placeId: '',
  })

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setIsLoading(true)
      const data = await api.getSavedLocations()
      setLocations(data)
    } catch (error) {
      console.error('Error loading locations:', error)
      toast.error(t('passenger.loadError') || 'Error al cargar ubicaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!newLocation.name || !newLocation.address) {
      toast.error(t('passenger.fillAllFields') || 'Completa todos los campos')
      return
    }

    try {
      await api.saveLocation(newLocation)
      toast.success(t('passenger.locationSaved') || 'Ubicación guardada')
      setIsDialogOpen(false)
      setNewLocation({ name: '', address: '', latitude: 0, longitude: 0, placeId: '' })
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || t('passenger.saveError') || 'Error al guardar')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    try {
      await api.deleteLocation(id)
      toast.success(t('passenger.locationDeleted') || 'Ubicación eliminada')
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || t('passenger.deleteError') || 'Error al eliminar')
    }
  }

  const handleUseLocation = (location: Location, type: 'origin' | 'destination') => {
    navigate('/passenger/request-trip', {
      state: {
        [type]: {
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          placeId: location.placeId,
        },
      },
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('passenger.favorites')}</h1>
          <p className="text-muted-foreground">
            {t('passenger.savedLocations') || 'Gestiona tus ubicaciones guardadas'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('passenger.addLocation') || 'Agregar Ubicación'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('passenger.addLocation') || 'Agregar Ubicación'}</DialogTitle>
              <DialogDescription>
                {t('passenger.addLocationDescription') || 'Guarda una ubicación para usarla rápidamente'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locationName">{t('passenger.locationName') || 'Nombre'}</Label>
                <Input
                  id="locationName"
                  placeholder={t('passenger.locationNamePlaceholder') || 'Casa, Trabajo, etc.'}
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationAddress">{t('passenger.address') || 'Dirección'}</Label>
                <div className="flex gap-2">
                  <Input
                    id="locationAddress"
                    placeholder={t('passenger.addressPlaceholder') || 'Buscar dirección...'}
                    value={newLocation.address}
                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // TODO: Implementar búsqueda con Google Places API
                      toast.info(t('passenger.searchPlaceholder') || 'Búsqueda próximamente')
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveLocation} className="flex-1">
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {t('passenger.noSavedLocations') || 'No tienes ubicaciones guardadas'}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('passenger.addLocation')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {location.name}
                </CardTitle>
                <CardDescription>{location.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseLocation(location, 'origin')}
                  >
                    {t('passenger.useAsOrigin') || 'Usar como Origen'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseLocation(location, 'destination')}
                  >
                    {t('passenger.useAsDestination') || 'Usar como Destino'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLocation(location.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

