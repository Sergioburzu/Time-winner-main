import { Link } from 'react-router-dom'
import LegalLayout from '../components/LegalLayout'
import { LEGAL, DELETE_ACCOUNT_PATH } from '../lib/legal'

/**
 * Política de privacidad (requisito de Google Play y del RGPD).
 * ⚠️ Revisa el texto y rellena los datos de src/lib/legal.ts antes de publicar.
 * Es una plantilla orientativa, no asesoramiento legal.
 */
export default function PrivacyPage() {
  const { appName, ownerName, contactEmail, country, lastUpdated } = LEGAL
  return (
    <LegalLayout title="Política de privacidad">
      <p className="legal-muted">Última actualización: {lastUpdated}</p>

      <h2>1. Quién es el responsable</h2>
      <p>
        El responsable del tratamiento de los datos de {appName} es <strong>{ownerName}</strong> ({country}).
        Puedes contactar para cualquier cuestión de privacidad en <strong>{contactEmail}</strong>.
      </p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li><strong>Cuenta del padre, madre o tutor:</strong> email y contraseña (la contraseña se guarda cifrada y nunca la vemos).</li>
        <li><strong>Datos de la familia:</strong> nombre de la familia y el PIN de padres (guardado como hash, no en texto).</li>
        <li><strong>Perfiles de los hijos:</strong> nombre o apodo, edad y un avatar (emoji). No pedimos apellidos, fotos, ubicación ni ningún otro dato del menor.</li>
        <li><strong>Uso de la app:</strong> tareas asignadas y completadas, minutos ganados y usados, estrellas y premios canjeados.</li>
        <li><strong>En tu dispositivo:</strong> preferencias como el tema claro u oscuro, el sonido y el temporizador activo. Se guardan solo en el dispositivo.</li>
      </ul>
      <p>No recogemos datos de ubicación, contactos, fotos ni identificadores publicitarios.</p>

      <h2>3. Para qué los usamos</h2>
      <p>
        Únicamente para prestar el servicio: guardar las tareas y el tiempo de pantalla de tu familia y
        mostrártelos en tus dispositivos. <strong>No mostramos publicidad, no vendemos datos y no
        usamos herramientas de analítica ni de seguimiento.</strong>
      </p>

      <h2>4. Base legal</h2>
      <p>
        La ejecución del servicio que solicitas al crear la cuenta (art. 6.1.b RGPD). Los datos de los menores los
        introduce el padre, madre o tutor, que es quien crea y gestiona la cuenta y consiente su tratamiento.
      </p>

      <h2>5. Menores</h2>
      <p>
        La cuenta solo puede crearla una persona adulta (padre, madre o tutor legal). Los niños usan la app
        bajo la supervisión de esa persona y la zona de padres está protegida con PIN. Los niños no pueden
        crear cuentas ni introducir datos personales propios.
      </p>

      <h2>6. Dónde se guardan y quién los trata</h2>
      <p>Usamos proveedores que actúan como encargados del tratamiento:</p>
      <ul>
        <li><strong>Supabase</strong>: base de datos y autenticación.</li>
        <li><strong>Vercel</strong>: alojamiento de la aplicación web.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo, siempre con las
        garantías previstas en el RGPD (por ejemplo, cláusulas contractuales tipo). Los datos viajan cifrados (HTTPS).
      </p>

      <h2>7. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tu cuenta exista. Si la eliminas, se borran de forma inmediata y definitiva todos los datos de
        la cuenta, la familia y los hijos.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a <strong>{contactEmail}</strong>. También puedes reclamar ante la Agencia Española de
        Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>

      <h2>9. Borrar tu cuenta</h2>
      <p>
        Puedes borrar tu cuenta y todos sus datos en cualquier momento desde <strong>Ajustes → Eliminar cuenta</strong>,
        o desde la página <Link to={DELETE_ACCOUNT_PATH}>Eliminar cuenta</Link>.
      </p>

      <h2>10. Cambios</h2>
      <p>Si cambiamos esta política, lo indicaremos en esta página actualizando la fecha de arriba.</p>
    </LegalLayout>
  )
}
