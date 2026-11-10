import { useState } from 'react'
import { Link } from 'react-router-dom'
import LegalLayout from '../components/LegalLayout'
import DeleteAccountForm from '../components/DeleteAccountForm'
import { LEGAL, PRIVACY_PATH } from '../lib/legal'

/**
 * Página pública para eliminar la cuenta. Google Play exige un enlace web
 * donde los usuarios puedan solicitar el borrado sin instalar la app.
 */
export default function DeleteAccountPage() {
  const [deleted, setDeleted] = useState(false)

  return (
    <LegalLayout title="Eliminar cuenta">
      {deleted ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontSize: '3rem' }}>👋</p>
          <h2>Cuenta eliminada</h2>
          <p>Hemos borrado tu cuenta y todos sus datos. Gracias por haber usado {LEGAL.appName}.</p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>
            Volver al inicio
          </Link>
        </div>
      ) : (
        <>
          <p>
            Desde aquí puedes eliminar tu cuenta de <strong>{LEGAL.appName}</strong> y todos los datos asociados.
            También puedes hacerlo dentro de la app en <strong>Ajustes → Eliminar cuenta</strong>.
          </p>

          <h2>Qué se elimina</h2>
          <ul>
            <li>Tu cuenta (email y contraseña).</li>
            <li>Tu familia y el PIN de padres.</li>
            <li>Los perfiles de tus hijos, sus tareas, historial, minutos, estrellas y premios.</li>
          </ul>
          <p>El borrado es inmediato y definitivo. No guardamos copias de tus datos.</p>

          <div style={{ marginTop: '1.5rem' }}>
            <DeleteAccountForm onDeleted={() => setDeleted(true)} />
          </div>

          <p className="legal-muted" style={{ marginTop: '1.5rem' }}>
            ¿No recuerdas la contraseña o no puedes acceder? Escribe a <strong>{LEGAL.contactEmail}</strong> desde
            el email de la cuenta y la eliminaremos en un plazo máximo de 30 días.
            Más información en la <Link to={PRIVACY_PATH}>política de privacidad</Link>.
          </p>
        </>
      )}
    </LegalLayout>
  )
}
