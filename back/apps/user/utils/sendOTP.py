from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from django.conf import settings
import logging
import threading

logger = logging.getLogger(__name__)

def send_sms_in_background(to_number: str, body_text: str) -> None:
    """
    Versión mejorada con:
    - Validación de configuración
    - Manejo de errores robusto
    - Compatibilidad con modo prueba
    """
    def _send_sms():
        try:
            # 1. Validar configuración
            required_settings = [
                'TWILIO_ACCOUNT_SID',
                'TWILIO_AUTH_TOKEN',
                'TWILIO_PHONE_NUMBER'
            ]
            
            for setting in required_settings:
                if not getattr(settings, setting, None):
                    logger.error(f'Configuración faltante: {setting}')
                    return

            # 2. Validar número destino
            if not to_number.startswith('+'):
                logger.error(f'Número inválido: {to_number}')
                return
            account_sid = settings.TWILIO_ACCOUNT_SID
            auth_token = settings.TWILIO_AUTH_TOKEN
            # 3. Inicializar cliente
            client = Client(account_sid, auth_token)

            # 4. Enviar mensaje
            message = client.messages.create(
                body=body_text[:160],
                from_=settings.TWILIO_PHONE_NUMBER,
                to=to_number
            )

            logger.info(f'SMS enviado a {to_number}. SID: {message.sid}')

        except TwilioRestException as e:
            logger.error(f'Error Twilio ({e.code}): {e.msg}')
        except Exception as e:
            logger.error(f'Error inesperado: {str(e)}')

    # Ejecutar en segundo plano
    threading.Thread(target=_send_sms, daemon=True).start()
    