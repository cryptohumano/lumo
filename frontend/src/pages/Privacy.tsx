import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Privacy() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('footer.privacy') || 'Política de Privacidad'}</CardTitle>
          <CardDescription>
            {t('privacy.lastUpdated') || 'Última actualización: '} {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
            <p>
              Peranto SSI NA, LLC ("nosotros", "nuestro", "la Empresa") opera la plataforma Lumo 
              ("la Plataforma", "el Servicio"). Esta Política de Privacidad describe cómo recopilamos, 
              utilizamos, almacenamos y protegemos su información personal cuando utiliza nuestro Servicio.
            </p>
            <p>
              Al utilizar la Plataforma, usted acepta la recopilación y el uso de información de acuerdo 
              con esta Política de Privacidad. Si no está de acuerdo con esta política, no debe utilizar 
              nuestro Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Información que Recopilamos</h2>
            <p>
              Recopilamos diferentes tipos de información para proporcionar, mejorar y proteger nuestro Servicio:
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.1. Información de Cuenta y Perfil</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de identificación:</strong> Nombre completo, dirección de correo electrónico, número de teléfono</li>
              <li><strong>Información de autenticación:</strong> Contraseña (almacenada de forma encriptada), tokens de autenticación</li>
              <li><strong>Datos de perfil:</strong> Nombre para mostrar, biografía, foto de perfil (avatar), país de residencia</li>
              <li><strong>Preferencias:</strong> Moneda preferida, preferencias de notificación</li>
              <li><strong>Roles y permisos:</strong> Roles asignados en la plataforma (Pasajero, Conductor, Anfitrión, etc.)</li>
              <li><strong>Estado de verificación:</strong> Estado de verificación de cuenta, verificación de correo electrónico</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.2. Información de Autenticación y Cuentas Vinculadas</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Proveedores OAuth:</strong> Información de cuentas vinculadas (Google, Facebook, Apple)</li>
              <li><strong>Tokens de acceso:</strong> Tokens de acceso, tokens de actualización, tokens de identificación</li>
              <li><strong>Metadatos de autenticación:</strong> Tipo de token, alcances, fechas de expiración</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.3. Información de Ubicación</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Direcciones guardadas:</strong> Nombres de ubicaciones, direcciones completas, ciudades, países</li>
              <li><strong>Coordenadas geográficas:</strong> Latitud y longitud de ubicaciones</li>
              <li><strong>Lugares frecuentes:</strong> Lugares marcados como predeterminados o favoritos</li>
              <li><strong>Datos de lugares:</strong> Información de lugares obtenida de servicios de mapas (Google Maps), incluyendo códigos postales, regiones</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.4. Información de Viajes</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de solicitud de viaje:</strong> Direcciones de origen y destino, coordenadas geográficas</li>
              <li><strong>Información de ruta:</strong> Distancia, duración estimada, polilíneas de ruta, límites geográficos</li>
              <li><strong>Detalles del viaje:</strong> Número de pasajeros, tipo de vehículo preferido, fechas y horarios programados</li>
              <li><strong>Estados del viaje:</strong> Fechas de inicio, finalización, aceptación, rechazo, cancelación</li>
              <li><strong>Información de seguridad:</strong> Códigos PIN, códigos QR para inicio de viaje</li>
              <li><strong>Notas y comentarios:</strong> Notas adicionales sobre el viaje</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.5. Información de Conductores y Vehículos</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Información de onboarding:</strong> Nombre completo, fecha de nacimiento, identificación nacional</li>
              <li><strong>Datos fiscales:</strong> Número de identificación fiscal (RUT, CUIT, RFC, CPF, CNPJ, NIT, RUC, etc.)</li>
              <li><strong>Información de licencia:</strong> Número de licencia de conducir, fecha de expiración, entidad emisora</li>
              <li><strong>Datos bancarios:</strong> Nombre del banco, número de cuenta, tipo de cuenta, número de ruta, país del banco</li>
              <li><strong>Información de empresa:</strong> Nombre de empresa, identificación fiscal de empresa, dirección de empresa (si aplica)</li>
              <li><strong>Documentos:</strong> Documentos de identidad, licencias de conducir, comprobantes de domicilio, estados de cuenta bancarios, registros de vehículos, seguros, antecedentes penales</li>
              <li><strong>Información de vehículos:</strong> Marca, modelo, año, color, placa/licencia de vehículo, tipo de vehículo, capacidad, fotos del vehículo</li>
              <li><strong>Estado de verificación:</strong> Estado de aprobación de vehículos, razones de rechazo</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.6. Información de Pagos</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Transacciones:</strong> Montos, monedas, métodos de pago, tarifas, montos netos</li>
              <li><strong>Detalles de pago:</strong> Información de métodos de pago (tarjetas, transferencias, billeteras digitales)</li>
              <li><strong>Estados de pago:</strong> Estados de procesamiento, razones de fallo, fechas de procesamiento</li>
              <li><strong>Identificadores:</strong> IDs de transacciones de proveedores de pago</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.7. Información de Comunicaciones</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Números de WhatsApp:</strong> Números de teléfono asociados, nombres, estado de actividad</li>
              <li><strong>Interacciones:</strong> Mensajes enviados y recibidos, números de teléfono, direcciones de comunicación</li>
              <li><strong>Estados de mensajes:</strong> Estados de entrega, lectura, fallos</li>
              <li><strong>Notificaciones:</strong> Tipos de notificaciones, títulos, mensajes, datos asociados</li>
              <li><strong>Preferencias de notificación:</strong> Canales preferidos (aplicación, correo, SMS, WhatsApp, push)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.8. Información de Experiencias y Reservas</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Experiencias:</strong> Títulos, descripciones, ubicaciones de inicio y fin, puntos de paso, precios, itinerarios, fotos, etiquetas</li>
              <li><strong>Reservas:</strong> Fechas de inicio y fin, número de participantes, información de pasajeros (nombre, teléfono, correo electrónico)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.9. Información de Reseñas y Calificaciones</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Calificaciones:</strong> Puntuaciones numéricas, títulos, comentarios</li>
              <li><strong>Estados de reseñas:</strong> Estados de aprobación, rechazo, ocultamiento</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.10. Información Técnica y de Uso</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de sesión:</strong> Tokens de sesión, fechas de creación y expiración</li>
              <li><strong>Metadatos:</strong> Información adicional almacenada en formato JSON para diversos propósitos operativos</li>
              <li><strong>Registros de actividad:</strong> Fechas de creación, actualización, última actividad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Finalidades del Tratamiento de Datos</h2>
            <p>Utilizamos su información personal para las siguientes finalidades:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.1. Compliance y Cumplimiento Legal</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cumplir con obligaciones legales y regulatorias aplicables</li>
              <li>Verificar identidades y realizar verificaciones de antecedentes cuando sea requerido por ley</li>
              <li>Mantener registros para auditorías y cumplimiento fiscal</li>
              <li>Responder a solicitudes de autoridades gubernamentales cuando sea legalmente requerido</li>
              <li>Prevenir actividades ilegales, fraudes y abusos</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.2. Operaciones del Servicio</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar, mantener y mejorar nuestros servicios</li>
              <li>Facilitar la conexión entre Pasajeros y Conductores</li>
              <li>Procesar solicitudes de viaje y gestionar reservas</li>
              <li>Calcular tarifas y procesar pagos</li>
              <li>Gestionar cuentas de usuario y autenticación</li>
              <li>Procesar solicitudes de onboarding de conductores</li>
              <li>Gestionar vehículos y verificaciones</li>
              <li>Proporcionar soporte al cliente y resolver problemas</li>
              <li>Enviar notificaciones sobre el estado de servicios y transacciones</li>
              <li>Gestionar experiencias de viaje y reservas</li>
              <li>Facilitar comunicaciones entre usuarios</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.3. Seguridad de los Usuarios</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verificar identidades de usuarios y conductores</li>
              <li>Validar licencias de conducir y documentos de vehículos</li>
              <li>Monitorear y prevenir actividades fraudulentas o sospechosas</li>
              <li>Gestionar códigos de seguridad (PINs, códigos QR) para inicio de viajes</li>
              <li>Rastrear ubicaciones durante viajes activos para seguridad</li>
              <li>Gestionar alertas de seguridad y notificaciones de emergencia</li>
              <li>Mantener registros de interacciones para investigaciones de seguridad</li>
              <li>Proteger contra acceso no autorizado a cuentas</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.4. Mejora del Servicio</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analizar patrones de uso para mejorar la experiencia del usuario</li>
              <li>Desarrollar nuevas funcionalidades</li>
              <li>Personalizar contenido y recomendaciones</li>
              <li>Realizar investigaciones y análisis de datos agregados y anonimizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Base Legal para el Procesamiento</h2>
            <p>Procesamos su información personal basándonos en:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consentimiento:</strong> Cuando nos ha dado su consentimiento explícito</li>
              <li><strong>Ejecución de contrato:</strong> Para cumplir con nuestros términos de servicio y proporcionar el servicio solicitado</li>
              <li><strong>Obligación legal:</strong> Para cumplir con obligaciones legales y regulatorias</li>
              <li><strong>Interés legítimo:</strong> Para operar, mantener y mejorar nuestros servicios, y para seguridad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Compartir Información</h2>
            <p>Podemos compartir su información en las siguientes circunstancias:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">5.1. Con Otros Usuarios</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Los Conductores pueden ver información limitada de Pasajeros (nombre, calificación) cuando aceptan un viaje</li>
              <li>Los Pasajeros pueden ver información limitada de Conductores (nombre, foto, calificación, vehículo)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">5.2. Con Proveedores de Servicios</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proveedores de servicios de pago para procesar transacciones</li>
              <li>Proveedores de servicios de mapas y geolocalización</li>
              <li>Proveedores de servicios de comunicación (WhatsApp, SMS, correo electrónico)</li>
              <li>Proveedores de servicios en la nube para almacenamiento y procesamiento</li>
              <li>Proveedores de servicios de análisis y monitoreo</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">5.3. Por Requisitos Legales</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cuando sea requerido por ley, orden judicial o proceso legal</li>
              <li>Para cumplir con solicitudes de autoridades gubernamentales</li>
              <li>Para proteger nuestros derechos, propiedad o seguridad, o la de nuestros usuarios</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">5.4. En Caso de Transacciones Comerciales</h3>
            <p>
              En caso de fusión, adquisición o venta de activos, su información puede ser transferida 
              como parte de dicha transacción.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Seguridad de los Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger su 
              información personal contra acceso no autorizado, alteración, divulgación o destrucción. 
              Estas medidas incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encriptación de datos en tránsito y en reposo</li>
              <li>Controles de acceso basados en roles</li>
              <li>Monitoreo continuo de seguridad</li>
              <li>Autenticación de múltiples factores cuando sea apropiado</li>
              <li>Almacenamiento seguro de contraseñas (hashing)</li>
              <li>Auditorías regulares de seguridad</li>
            </ul>
            <p>
              Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 
              100% seguro. Aunque nos esforzamos por proteger su información, no podemos garantizar 
              seguridad absoluta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Retención de Datos</h2>
            <p>
              Conservamos su información personal durante el tiempo necesario para cumplir con las 
              finalidades descritas en esta Política, a menos que la ley requiera o permita un período 
              de retención más largo. Los factores que determinan el período de retención incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>La naturaleza de la información</li>
              <li>Los requisitos legales y regulatorios</li>
              <li>La necesidad de mantener registros para operaciones comerciales</li>
              <li>La necesidad de resolver disputas o hacer cumplir acuerdos</li>
            </ul>
            <p>
              Cuando eliminamos información, lo hacemos de manera segura utilizando métodos que 
              hacen que la información sea irrecuperable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Sus Derechos</h2>
            <p>Dependiendo de su jurisdicción, usted puede tener los siguientes derechos:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceso:</strong> Solicitar acceso a su información personal</li>
              <li><strong>Rectificación:</strong> Solicitar corrección de información inexacta o incompleta</li>
              <li><strong>Eliminación:</strong> Solicitar eliminación de su información personal ("derecho al olvido")</li>
              <li><strong>Portabilidad:</strong> Recibir su información en un formato estructurado y comúnmente usado</li>
              <li><strong>Oposición:</strong> Oponerse al procesamiento de su información en ciertas circunstancias</li>
              <li><strong>Limitación:</strong> Solicitar limitación del procesamiento de su información</li>
              <li><strong>Retirar consentimiento:</strong> Retirar su consentimiento cuando el procesamiento se base en consentimiento</li>
            </ul>
            <p>
              Para ejercer estos derechos, puede contactarnos a través de los canales de soporte 
              disponibles en la Plataforma. Responderemos a su solicitud dentro de los plazos 
              establecidos por la ley aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso 
              de la Plataforma y personalizar contenido. Puede controlar el uso de cookies a través 
              de la configuración de su navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Transferencias Internacionales</h2>
            <p>
              Su información puede ser transferida y procesada en países distintos al suyo. Nos 
              aseguramos de que dichas transferencias cumplan con las leyes de protección de datos 
              aplicables y que se implementen salvaguardas apropiadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Menores de Edad</h2>
            <p>
              Nuestro Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente 
              información personal de menores. Si descubrimos que hemos recopilado información de un 
              menor, tomaremos medidas para eliminar dicha información.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos de 
              cualquier cambio publicando la nueva Política en esta página y actualizando la fecha 
              de "Última actualización". Le recomendamos revisar esta Política periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Ley Aplicable y Resolución de Disputas</h2>
            <p>
              <strong>Esta Política de Privacidad se regirá e interpretará de acuerdo con las leyes 
              de los Estados Unidos Mexicanos.</strong>
            </p>
            <p>
              <strong>Cualquier disputa, controversia o reclamo relacionado con el procesamiento de 
              datos personales, privacidad o esta Política de Privacidad será resuelto exclusivamente 
              ante los tribunales competentes de los Estados Unidos Mexicanos.</strong>
            </p>
            <p>
              Usted acepta someterse a la jurisdicción de dichos tribunales para cualquier asunto 
              relacionado con privacidad y protección de datos personales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contacto</h2>
            <p>
              Si tiene preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad 
              o el procesamiento de su información personal, puede contactarnos a través de los canales 
              de soporte disponibles en la Plataforma.
            </p>
            <p>
              <strong>Operado por:</strong> Peranto SSI NA, LLC<br />
              <strong>Estado de Incorporación:</strong> Wyoming, Estados Unidos de América
            </p>
          </section>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
