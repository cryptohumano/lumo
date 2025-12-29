import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Terms() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('footer.terms') || 'Términos y Condiciones'}</CardTitle>
          <CardDescription>
            {t('terms.lastUpdated') || 'Última actualización: '} {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar la plataforma Lumo ("la Plataforma", "el Servicio"), operada por Peranto SSI NA, LLC 
              ("nosotros", "nuestro", "la Empresa"), usted acepta estar sujeto a estos Términos y Condiciones de Servicio 
              ("Términos"). Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestro Servicio.
            </p>
            <p>
              Estos Términos constituyen un acuerdo legalmente vinculante entre usted y Peranto SSI NA, LLC. 
              Nos reservamos el derecho de modificar estos Términos en cualquier momento, y dichas modificaciones 
              entrarán en vigor inmediatamente después de su publicación en la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Descripción del Servicio</h2>
            <p>
              Lumo es una plataforma tecnológica que conecta a usuarios que requieren servicios de transporte 
              ("Pasajeros") con conductores independientes o empresas de transporte ("Conductores") que ofrecen 
              servicios de movilidad. La Plataforma también puede ofrecer servicios relacionados con experiencias 
              de viaje y reservas.
            </p>
            <p>
              <strong>Importante:</strong> Lumo actúa únicamente como intermediario tecnológico. No somos un 
              proveedor de servicios de transporte, ni somos responsables de los servicios de transporte 
              proporcionados por los Conductores. La relación contractual directa es entre el Pasajero y el Conductor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Uso de la Plataforma</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">3.1. Elegibilidad</h3>
            <p>
              Para utilizar la Plataforma, usted debe:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tener al menos 18 años de edad o la mayoría de edad legal en su jurisdicción</li>
              <li>Tener la capacidad legal para celebrar contratos vinculantes</li>
              <li>Proporcionar información precisa, actualizada y completa durante el registro</li>
              <li>Mantener la seguridad de su cuenta y contraseña</li>
              <li>Notificarnos inmediatamente de cualquier uso no autorizado de su cuenta</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.2. Conducta del Usuario</h3>
            <p>Usted se compromete a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utilizar la Plataforma únicamente para fines legales y de acuerdo con estos Términos</li>
              <li>No interferir con el funcionamiento de la Plataforma</li>
              <li>No intentar acceder a áreas restringidas de la Plataforma</li>
              <li>No utilizar la Plataforma para transmitir contenido ilegal, ofensivo o que viole derechos de terceros</li>
              <li>No suplantar la identidad de otra persona o entidad</li>
              <li>No recopilar información de otros usuarios sin su consentimiento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cuentas de Usuario</h2>
            <p>
              Para utilizar ciertas funcionalidades de la Plataforma, debe crear una cuenta. Usted es responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Todas las actividades que ocurran bajo su cuenta</li>
              <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
              <li>Proporcionar información precisa y actualizada</li>
            </ul>
            <p>
              Nos reservamos el derecho de suspender o terminar su cuenta si viola estos Términos o si 
              tenemos razones para creer que su uso de la Plataforma es fraudulento o perjudicial.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Servicios de Transporte</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">5.1. Para Pasajeros</h3>
            <p>
              Como Pasajero, usted puede solicitar servicios de transporte a través de la Plataforma. 
              Al solicitar un viaje, usted acepta:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pagar el precio indicado en la Plataforma</li>
              <li>Respetar al Conductor y su vehículo</li>
              <li>Proporcionar información precisa sobre su ubicación y destino</li>
              <li>Cumplir con las leyes locales aplicables</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">5.2. Para Conductores</h3>
            <p>
              Como Conductor, usted puede ofrecer servicios de transporte a través de la Plataforma. 
              Para ser elegible, debe:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cumplir con todos los requisitos legales y regulatorios de su jurisdicción</li>
              <li>Poseer una licencia de conducir válida y vigente</li>
              <li>Mantener un vehículo en condiciones adecuadas y seguro</li>
              <li>Completar el proceso de verificación requerido por la Plataforma</li>
              <li>Proporcionar servicios de transporte de manera profesional y segura</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Pagos y Tarifas</h2>
            <p>
              La Plataforma facilita el procesamiento de pagos entre Pasajeros y Conductores. 
              Las tarifas se calculan según la distancia, duración y otros factores, y pueden variar 
              según la ubicación geográfica y el tipo de servicio.
            </p>
            <p>
              Lumo puede cobrar una comisión por el uso de la Plataforma, la cual se deducirá del 
              pago total antes de ser transferido al Conductor. Las tarifas y comisiones se 
              comunicarán claramente antes de confirmar un servicio.
            </p>
            <p>
              Todos los pagos se procesan a través de proveedores de servicios de pago de terceros. 
              Usted acepta cumplir con los términos y condiciones de dichos proveedores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cancelaciones y Reembolsos</h2>
            <p>
              Las políticas de cancelación y reembolso pueden variar según el tipo de servicio y 
              las circunstancias específicas. En general:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Los Pasajeros pueden cancelar viajes según las políticas establecidas</li>
              <li>Pueden aplicarse tarifas de cancelación según el tiempo transcurrido</li>
              <li>Los reembolsos se procesarán según las políticas aplicables y pueden tardar varios días hábiles</li>
              <li>Lumo se reserva el derecho de modificar las políticas de cancelación y reembolso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitación de Responsabilidad</h2>
            <p>
              <strong>LA PLATAFORMA SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD".</strong> 
              En la máxima medida permitida por la ley aplicable, Peranto SSI NA, LLC no será 
              responsable de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Daños directos, indirectos, incidentales, especiales o consecuentes</li>
              <li>Pérdida de beneficios, datos o uso</li>
              <li>Lesiones personales o daños a la propiedad resultantes del uso de los servicios de transporte</li>
              <li>Interrupciones del servicio o errores técnicos</li>
              <li>Acciones u omisiones de Conductores o Pasajeros</li>
            </ul>
            <p>
              Nuestra responsabilidad total hacia usted por cualquier reclamo relacionado con el 
              uso de la Plataforma no excederá el monto que haya pagado a través de la Plataforma 
              en los doce (12) meses anteriores al evento que dio lugar al reclamo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Indemnización</h2>
            <p>
              Usted acepta indemnizar, defender y eximir de responsabilidad a Peranto SSI NA, LLC, 
              sus afiliados, directores, funcionarios, empleados y agentes de y contra cualquier 
              reclamo, demanda, pérdida, responsabilidad y gasto (incluidos los honorarios de abogados) 
              que surjan de o estén relacionados con:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Su uso de la Plataforma</li>
              <li>Su violación de estos Términos</li>
              <li>Su violación de cualquier ley o derecho de terceros</li>
              <li>El contenido que publique o transmita a través de la Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Propiedad Intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual en la Plataforma, incluyendo pero no 
              limitado a software, diseño, texto, gráficos, logotipos, iconos y compilaciones 
              de datos, son propiedad de Peranto SSI NA, LLC o sus licenciantes.
            </p>
            <p>
              Se le otorga una licencia limitada, no exclusiva, no transferible y revocable para 
              acceder y utilizar la Plataforma únicamente para fines personales y no comerciales, 
              de acuerdo con estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Terminación</h2>
            <p>
              Podemos terminar o suspender su acceso a la Plataforma inmediatamente, sin previo 
              aviso, por cualquier motivo, incluyendo pero no limitado a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violación de estos Términos</li>
              <li>Uso fraudulento o ilegal de la Plataforma</li>
              <li>Actividad que pueda dañar nuestra reputación o la de otros usuarios</li>
              <li>Inactividad prolongada de su cuenta</li>
            </ul>
            <p>
              Usted puede terminar su cuenta en cualquier momento contactándonos. Al terminar, 
              su derecho a utilizar la Plataforma cesará inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Modificaciones del Servicio</h2>
            <p>
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto 
              de la Plataforma en cualquier momento, con o sin previo aviso. No seremos responsables 
              ante usted ni ante ningún tercero por cualquier modificación, suspensión o 
              discontinuación del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Ley Aplicable y Resolución de Disputas</h2>
            <p>
              <strong>Estos Términos se regirán e interpretarán de acuerdo con las leyes del 
              Estado de Wyoming, Estados Unidos de América, sin dar efecto a ningún principio 
              de conflictos de leyes.</strong>
            </p>
            <p>
              <strong>Cualquier controversia, reclamo o disputa que surja de o esté relacionada 
              con estos Términos, el uso de la Plataforma o los servicios proporcionados a través 
              de la misma, será resuelta exclusivamente ante los tribunales competentes del Estado 
              de Wyoming, Estados Unidos de América.</strong>
            </p>
            <p>
              Usted acepta someterse a la jurisdicción personal de dichos tribunales y renuncia 
              a cualquier objeción a la jurisdicción o lugar de dichos tribunales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Disposiciones Generales</h2>
            <h3 className="text-xl font-semibold mt-4 mb-2">14.1. Acuerdo Completo</h3>
            <p>
              Estos Términos constituyen el acuerdo completo entre usted y Peranto SSI NA, LLC 
              con respecto al uso de la Plataforma y reemplazan todos los acuerdos anteriores.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">14.2. Divisibilidad</h3>
            <p>
              Si alguna disposición de estos Términos se considera inválida o inaplicable, 
              las disposiciones restantes permanecerán en pleno vigor y efecto.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">14.3. Renuncia</h3>
            <p>
              El hecho de que no ejerzamos o hagamos valer cualquier derecho o disposición de 
              estos Términos no constituirá una renuncia a tal derecho o disposición.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">14.4. Cesión</h3>
            <p>
              No puede ceder o transferir estos Términos o sus derechos u obligaciones bajo 
              estos Términos sin nuestro consentimiento previo por escrito. Podemos ceder 
              estos Términos sin restricciones.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contacto</h2>
            <p>
              Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos a través 
              de los canales de soporte disponibles en la Plataforma.
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
