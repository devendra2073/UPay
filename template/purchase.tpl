

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt - UPay</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0b132b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

    @media only screen and (max-width: 600px) {
      .outer-wrapper { width: 100% !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 20px !important; }
      .header-padding { padding: 24px 20px 20px 20px !important; }
      .amount-display { font-size: 28px !important; }
      .data-label { width: 40% !important; font-size: 13px !important; }
      .data-value { width: 60% !important; font-size: 13px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0c1427;">

  <!-- Email Canvas -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0c1427;">
    <tr>
      <td align="center" style="padding: 40px 12px 60px 12px;">

        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.25);" class="outer-wrapper">
          
          <!-- Top Merchant Bar -->
          <tr>
            <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #edf2f7;" class="header-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="middle">
                    <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; display: block; margin-bottom: 4px;">Paid to</span>
                    <span style="font-size: 18px; font-weight: 700; color: #1a202c; letter-spacing: -0.2px;">%%merchant_name</span>
                  </td>
                  <td valign="middle" align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #e6fffa; color: #047481; border: 1px solid #b2f5ea; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ● Successful
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Amount Hero -->
          <tr>
            <td align="center" style="padding: 32px 32px 28px 32px; background-color: #f7fafc; border-bottom: 1px solid #edf2f7;" class="header-padding">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #718096; margin-bottom: 6px;">
                Amount Paid
              </div>
              <div style="font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;" class="amount-display">
                ₹%%amount
              </div>
              <div style="font-size: 13px; color: #4a5568; margin-top: 6px;">
                on %%payment_date
              </div>
            </td>
          </tr>

          <!-- Key Details List -->
          <tr>
            <td style="padding: 28px 32px 20px 32px;" class="content-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Order ID -->
                <tr>
                  <td style="padding: 10px 0; font-size: 13px; color: #718096; font-weight: 500;" class="data-label">Order ID</td>
                  <td align="right" style="padding: 10px 0; font-size: 13px; font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #1a202c;" class="data-value">
                    %%order_id
                  </td>
                </tr>

                <!-- Customer Name -->
                <tr>
                  <td style="padding: 10px 0; font-size: 13px; color: #718096; font-weight: 500; border-top: 1px solid #f1f5f9;" class="data-label">Customer Name</td>
                  <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #1a202c; border-top: 1px solid #f1f5f9;" class="data-value">
                    %%customer_name
                  </td>
                </tr>

                <!-- Mobile Number -->
                <tr>
                  <td style="padding: 10px 0; font-size: 13px; color: #718096; font-weight: 500; border-top: 1px solid #f1f5f9;" class="data-label">Mobile Number</td>
                  <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #1a202c; border-top: 1px solid #f1f5f9;" class="data-value">
                    %%mobile_number
                  </td>
                </tr>

                <!-- Merchant Reference -->
                <tr>
                  <td style="padding: 10px 0; font-size: 13px; color: #718096; font-weight: 500; border-top: 1px solid #f1f5f9;" class="data-label">Merchant</td>
                  <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #1a202c; border-top: 1px solid #f1f5f9;" class="data-value">
                    %%merchant_name
                  </td>
                </tr>

                <!-- Payment Reference / Transaction ID -->
                <tr>
                  <td style="padding: 10px 0; font-size: 13px; color: #718096; font-weight: 500; border-top: 1px solid #f1f5f9;" class="data-label">UPay Reference ID</td>
                  <td align="right" style="padding: 10px 0; font-size: 13px; font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; color: #1a202c; border-top: 1px solid #f1f5f9;" class="data-value">
                    %%transaction_id
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 32px 28px 32px;" class="content-padding">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #0c2340;">
                    <a href="{{receipt_url}}" target="_blank" style="display: block; width: 100%; padding: 12px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; text-align: center; letter-spacing: 0.3px;">
                      View &amp; Download Receipt
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support & Grievance Row -->
          <tr>
            <td style="padding: 16px 32px 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;" class="content-padding">
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 18px; text-align: center;">
                For questions regarding product delivery or services, contact <strong>%%merchant_name</strong>. For payment authorization or gateway disputes, write to <a href="mailto:support@upay.com" style="color: #3182ce; text-decoration: none;">support@upay.com</a>.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Card Container -->

        <!-- Razorpay-style Platform Trust Footer -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin-top: 24px;">
          <tr>
            <td align="center" style="padding: 0 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="font-size: 12px; color: #718096; font-weight: 500; padding-right: 6px;">
                    Secured by
                  </td>
                  <td valign="middle" style="font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.3px;">
                    <span style="color: #3b82f6;">U</span>PAY
                  </td>
                </tr>
              </table>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #4a5568; line-height: 16px;">
                This is a system-generated transaction confirmation. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
