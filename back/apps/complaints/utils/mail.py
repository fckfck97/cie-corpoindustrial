import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_complaint_email(recipient_email, complaint_details):

    if complaint_details:

        subject = 'Nueva Denuncia Registrada'
        body = f'''
            <html>
            <body style="font-family: Arial, sans-serif;">
                <p>Hola,</p>
                <p>Se ha registrado una nueva denuncia: {complaint_details}</p>
                <p>Saludos,</p>
                <p>El equipo de CIE</p>
            </body>
            </html>
        '''
        # Configurar el correo electrónico
        email_msg = MIMEMultipart()
        email_msg['Subject'] = 'CIE - Corpoindustrial'
        email_msg['From'] = 'desarrollo.aspai@gmail.com'
        email_msg['To'] = recipient_email

        # Adjuntar el cuerpo del correo en formato HTML
        email_msg.attach(MIMEText(body, 'html'))

        sender_email = 'desarrollo.aspai@gmail.com'
        password = 'geqs bslc mqlf ssmt'  # No es recomendable incluir contraseñas directamente en el código

        try:
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, password)
                server.send_message(email_msg)
        except Exception as e:
            print(f"Error al enviar el correo: {e}")
