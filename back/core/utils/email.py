from django.core.mail.backends.smtp import EmailBackend
# Removed unused import
import threading
import traceback
import smtplib

class CustomEmailBackend(EmailBackend):
    def open(self):
        if self.connection:
            return False
        try:
            self.connection = smtplib.SMTP(
                self.host, 
                self.port, 
                local_hostname=self.host, 
                timeout=self.timeout
            )
            if self.use_tls:
                self.connection.ehlo()
                self.connection.starttls()  # No keyfile or certfile arguments here
                self.connection.ehlo()

            if self.username and self.password:
                try:
                    self.connection.login(self.username, self.password)
                except smtplib.SMTPAuthenticationError as e:
                    raise Exception("SMTP Authentication failed. Check your credentials or security policy.") from e
            return True
        except Exception:
            if not self.fail_silently:
                raise
            return False

    def send_messages(self, email_messages):
        for email_message in email_messages:
            threading.Thread(target=self._send_email, args=(email_message,)).start()

    def _send_email(self, email_message):
        try:
            # Set the email content subtype as needed
            email_message.content_subtype = 'html'
            # Use the original email_message object that contains attachments
            super().send_messages([email_message])
        except Exception as e:
            traceback.print_exc()

