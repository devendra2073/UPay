<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #334155; border-radius: 16px; overflow: hidden; margin-top: 40px; }
        .header { background-color: #4f46e5; padding: 40px text-align: center; color: white; }
        .content { padding: 40px 30px; line-height: 1.6; text-align: center; }
        .otp-container { background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 30px 0; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #4f46e5; border: 1px dashed #cbd5e1; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px; }
        .btn { background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main">
            <tr>
                <td class="header" style="text-align: center; padding: 30px;">
                    <h1 style="margin: 0; font-size: 24px;">UPay</h1>
                </td>
            </tr>
            <tr>
                <td class="content">
                    <h2 style="color: #1e293b; margin-top: 0;">Verify your email address</h2>
                    <p>Hi %%firstname,</p>
                    <p>Thank you for joining <strong>UPay</strong>! To finish setting up your account, please use the following one-time password (OTP) to verify your email:</p>
                    
                    <div class="otp-container">
                        %%otp
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b;">This code will expire in 10 minutes. If you did not request this code, please ignore this email or contact support.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #94a3b8;">
                        Security Tip: Never share your OTP with anyone, including UPay staff.
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="footer">
            <p>&copy; 2026 UPay Inc. | 123 Fintech Way, San Francisco, CA</p>
            <p><a href="#" style="color: #4f46e5; text-decoration: none;">Help Center</a> &bull; <a href="#" style="color: #4f46e5; text-decoration: none;">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
