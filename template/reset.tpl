<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your UPay Password</title>
    <style>
        /* Outlook and Gmail Compatibility */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        @media screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 20px !important; }
        }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <h1 style="margin: 0; color: #2563eb; font-size: 32px; font-weight: 800; font-style: italic; letter-spacing: -1px;">UPay</h1>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: 500;">Secure Payment Gateway</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 20px 40px 40px 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 24px;">
                                Hello, %%firstname <br><br>
                                We received a request to reset the password for your UPay account. Click the button below to choose a new password. This link will expire in 60 minutes.
                            </p>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="%%link" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 20px;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 18px;">
                                &copy; 2026 UPay Inc. All rights reserved.<br>
                                123 Fintech Plaza, Silicon Valley, CA
                            </p>
                            <div style="margin-top: 15px;">
                                <a href="https://u-pay-seven.vercel.app/privacy.html" style="color: #64748b; text-decoration: underline; font-size: 12px;">Privacy Policy</a>
                                <span style="color: #cbd5e1; padding: 0 8px;">|</span>
                                <a href="#" style="color: #64748b; text-decoration: underline; font-size: 12px;">Support Center</a>
                            </div>
                        </td>
                    </tr>
                </table>
                
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                    <tr>
                        <td style="padding: 20px 10px; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                                If the button doesn't work, copy and paste this link into your browser:<br>
                                <a href="%%link" style="color: #3b82f6;">%%link</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
