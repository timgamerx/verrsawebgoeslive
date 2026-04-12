// @ts-nocheck
import { sendEmail as sendSecureEmail } from "./securePaymentApi";

// SendGrid Email Service Configuration
// API key is handled server-side
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// Email Templates
export const emailTemplates = {
  // Admin notification template
  adminPasswordReset: (
    userEmail: string,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: "Password Reset Notification - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Password Reset Alert</p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">🔐 Password Reset Activity</h3>
            <p style="color: #856404; margin: 0; line-height: 1.5;">
              A user has successfully reset their password on the Verrsa platform.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Reset Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">User Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Platform:</td>
                <td style="padding: 8px 0; color: #333;">${
                  true ? "Web Browser" : "Mobile App"
                }</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated security notification from Verrsa Admin System
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - PASSWORD RESET NOTIFICATION
      
      A user has successfully reset their password on the Verrsa platform.
      
      User Email: ${userEmail}
      Timestamp: ${timestamp}
      Platform: ${true ? "Web Browser" : "Mobile App"}
      
      This is an automated security notification from Verrsa Admin System.
    `,
  }),

  // Subscription payment notification
  subscriptionPayment: (
    userEmail: string,
    planName: string,
    amount: number,
    currency: string,
    paymentReference: string,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: "New Subscription Payment - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Subscription Payment Notification</p>
          </div>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin: 0 0 10px 0;">💳 New Subscription Payment Received</h3>
            <p style="color: #155724; margin: 0; line-height: 1.5;">
              A user has successfully completed a subscription payment.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Payment Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">User Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Plan:</td>
                <td style="padding: 8px 0; color: #333;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Amount:</td>
                <td style="padding: 8px 0; color: #333; font-size: 18px; font-weight: bold;">${currency} ${amount.toFixed(
                  2,
                )}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Reference:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${paymentReference}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated payment notification from Verrsa Payment System
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - SUBSCRIPTION PAYMENT NOTIFICATION
      
      A user has successfully completed a subscription payment.
      
      User Email: ${userEmail}
      Plan: ${planName}
      Amount: ${currency} ${amount.toFixed(2)}
      Reference: ${paymentReference}
      Timestamp: ${timestamp}
      
      This is an automated payment notification from Verrsa Payment System.
    `,
  }),

  // Ad payment notification
  adPayment: (
    userEmail: string,
    adType: string,
    amount: number,
    currency: string,
    paymentReference: string,
    duration: string,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: "New Advertisement Payment - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Advertisement Payment Notification</p>
          </div>
          
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #0c5460; margin: 0 0 10px 0;">📢 New Ad Payment Received</h3>
            <p style="color: #0c5460; margin: 0; line-height: 1.5;">
              A user has successfully completed an advertisement payment.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Payment Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">User Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Ad Type:</td>
                <td style="padding: 8px 0; color: #333;">${adType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Duration:</td>
                <td style="padding: 8px 0; color: #333;">${duration}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Amount:</td>
                <td style="padding: 8px 0; color: #333; font-size: 18px; font-weight: bold;">${currency} ${amount.toFixed(
                  2,
                )}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Reference:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace;">${paymentReference}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated payment notification from Verrsa Payment System
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - ADVERTISEMENT PAYMENT NOTIFICATION
      
      A user has successfully completed an advertisement payment.
      
      User Email: ${userEmail}
      Ad Type: ${adType}
      Duration: ${duration}
      Amount: ${currency} ${amount.toFixed(2)}
      Reference: ${paymentReference}
      Timestamp: ${timestamp}
      
      This is an automated payment notification from Verrsa Payment System.
    `,
  }),

  // User confirmation template
  userPasswordReset: (userEmail: string, timestamp: string): EmailTemplate => ({
    to: userEmail,
    subject: "Password Updated Successfully - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Password Update Confirmation</p>
          </div>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
            <div style="text-align: center;">
              <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 24px;">✅ Password Updated Successfully!</h2>
              <p style="color: #155724; margin: 0; font-size: 16px;">
                Your Verrsa account password has been updated successfully.
              </p>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Update Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Account:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Updated:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Platform:</td>
                <td style="padding: 8px 0; color: #333;">${
                  true ? "Web Browser" : "Mobile App"
                }</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 25px;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">🔒 Security Notice</h4>
            <p style="color: #856404; margin: 0; line-height: 1.6;">
              If you did not make this change, please contact our support team immediately at 
              <a href="mailto:hello@verrsa.org" style="color: #00BFFF; text-decoration: none;">hello@verrsa.org</a>
              or secure your account by changing your password again.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <a href="https://verrsa.org" style="display: inline-block; background-color: #00BFFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Login to Verrsa
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              Need help? Contact us at <a href="mailto:hello@verrsa.org" style="color: #00BFFF;">hello@verrsa.org</a>
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - PASSWORD UPDATE CONFIRMATION
      
      ✅ Password Updated Successfully!
      
      Your Verrsa account password has been updated successfully.
      
      Account: ${userEmail}
      Updated: ${timestamp}
      Platform: ${true ? "Web Browser" : "Mobile App"}
      
      🔒 SECURITY NOTICE:
      If you did not make this change, please contact our support team immediately at hello@verrsa.org or secure your account by changing your password again.
      
      Login to Verrsa: https://verrsa.org
      
      Need help? Contact us at hello@verrsa.org
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),

  // User welcome email on signup
  userWelcomeSignup: (
    userEmail: string,
    userName: string,
    username: string,
  ): EmailTemplate => ({
    to: userEmail,
    subject: "Welcome to Verrsa 🎉",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Welcome to Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">We're excited to have you on board!</p>
          </div>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
            <div style="text-align: center;">
              <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 24px;">🎉 Account Created Successfully</h2>
              <p style="color: #155724; margin: 0; font-size: 16px;">
                Hi ${userName}, your account (@${username}) is ready.
              </p>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Your Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Username:</td>
                <td style="padding: 8px 0; color: #333;">@${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <a href="https://verrsa.org" style="display: inline-block; background-color: #00BFFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Explore Verrsa
            </a>
          </div>

          

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              Need help? Contact us at <a href="mailto:hello@verrsa.org" style="color: #00BFFF;">hello@verrsa.org</a>
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      WELCOME TO VERRSA

      Hi ${userName}, your account (@${username}) is ready.
      Email: ${userEmail}

      Explore Verrsa: https://verrsa.org

      Need help? Contact us at hello@verrsa.org
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),

  // New user signup notification to admin
  adminNewSignup: (
    userEmail: string,
    userName: string,
    username: string,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: "New User Signup - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">New User Registration</p>
          </div>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin: 0 0 10px 0;">🎉 New User Joined!</h3>
            <p style="color: #155724; margin: 0; line-height: 1.5;">
              A new user has successfully signed up on the Verrsa platform.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">User Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Full Name:</td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Username:</td>
                <td style="padding: 8px 0; color: #333;">@${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Registration Time:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Platform:</td>
                <td style="padding: 8px 0; color: #333;">${
                  true ? "Web Browser" : "Mobile App"
                }</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated notification from Verrsa
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - NEW USER SIGNUP
      
      🎉 New User Joined!
      
      A new user has successfully signed up on the Verrsa platform.
      
      USER DETAILS:
      Full Name: ${userName}
      Username: @${username}
      Email: ${userEmail}
      Registration Time: ${timestamp}
      Platform: ${true ? "Web Browser" : "Mobile App"}
      
      This is an automated notification from Verrsa.
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),

  // Live stream notification to admin
  liveStreamStarted: (
    userEmail: string,
    userName: string,
    username: string,
    communityId: string,
    liveStreamId: string,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: "New Live Stream Started - Verrsa",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Live Stream Alert</p>
          </div>
          
          <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #2e7d32; margin: 0 0 10px 0;">🟢 LIVE Stream Started!</h3>
            <p style="color: #2e7d32; margin: 0; line-height: 1.5;">
              A community owner has started a live stream on Verrsa.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Stream Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Streamer:</td>
                <td style="padding: 8px 0; color: #333;">${userName} (@${username})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Email:</td>
                <td style="padding: 8px 0; color: #333;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Community ID:</td>
                <td style="padding: 8px 0; color: #333;">${communityId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Stream ID:</td>
                <td style="padding: 8px 0; color: #333;">${liveStreamId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Started At:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Platform:</td>
                <td style="padding: 8px 0; color: #333;">${true ? "Web Browser" : "Mobile App"}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; line-height: 1.5;">
              <strong>🎥 View Stream:</strong> <a href="https://www.verrsa.org/community/${communityId}/live" style="color: #00BFFF;">Click here to watch</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated notification from Verrsa
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - LIVE STREAM ALERT
      
      🟢 LIVE Stream Started!
      
      A community owner has started a live stream on Verrsa.
      
      STREAM DETAILS:
      Streamer: ${userName} (@${username})
      Email: ${userEmail}
      Community ID: ${communityId}
      Stream ID: ${liveStreamId}
      Started At: ${timestamp}
      Platform: ${true ? "Web Browser" : "Mobile App"}
      
      View Stream: https://www.verrsa.org/community/${communityId}/live
      
      This is an automated notification from Verrsa.
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),

  // Content report notification to admin
  contentReport: (
    reporterEmail: string,
    contentType: string,
    violationType: string,
    reason: string,
    contentId: string,
    reportedUserEmail: string | null,
    timestamp: string,
  ): EmailTemplate => ({
    to: "hello@verrsa.org",
    subject: `🚨 Content Reported - ${contentType} - Verrsa`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">Verrsa</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Content Moderation Alert</p>
          </div>
          
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #721c24; margin: 0 0 10px 0;">🚨 Content Reported by User</h3>
            <p style="color: #721c24; margin: 0; line-height: 1.5;">
              A user has reported ${contentType} content for policy violation. Please review this report as soon as possible.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Report Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Content Type:</td>
                <td style="padding: 8px 0; color: #333;">${contentType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Violation Type:</td>
                <td style="padding: 8px 0; color: #d9534f; font-weight: bold;">${violationType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Reporter:</td>
                <td style="padding: 8px 0; color: #333;">${reporterEmail}</td>
              </tr>
              ${
                reportedUserEmail
                  ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Reported User:</td>
                <td style="padding: 8px 0; color: #333;">${reportedUserEmail}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Content ID:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 12px;">${contentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Timestamp:</td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${
            reason
              ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">📝 Additional Details:</h4>
            <p style="color: #856404; margin: 0; line-height: 1.6;">
              ${reason}
            </p>
          </div>
          `
              : ""
          }

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://verrsa.org" style="display: inline-block; background-color: #d9534f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Review in Moderation Dashboard
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              This is an automated moderation alert from Verrsa
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      VERRSA - CONTENT REPORTED
      
      🚨 Content Reported by User
      
      A user has reported ${contentType} content for policy violation.
      
      REPORT DETAILS:
      Content Type: ${contentType}
      Violation Type: ${violationType}
      Reporter: ${reporterEmail}
      ${reportedUserEmail ? `Reported User: ${reportedUserEmail}` : ""}
      Content ID: ${contentId}
      Timestamp: ${timestamp}
      
      ${reason ? `ADDITIONAL DETAILS:\n${reason}` : ""}
      
      Please review this report in the Moderation Dashboard: https://verrsa.org
      
      This is an automated moderation alert from Verrsa.
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),

  // User subscription confirmation
  subscriptionConfirmation: (
    userEmail: string,
    userName: string,
    planType: string,
    amount: number,
    expiresAt: string,
  ): EmailTemplate => ({
    to: userEmail,
    subject: `Welcome to ${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription! 🎉`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="/assets/verrsa-logo.png" alt="Verrsa Logo" style="height: 50px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #00BFFF; margin: 0; font-size: 28px;">🎉 Thank You for Subscribing!</h1>
          </div>
          
          <p style="color: #333; line-height: 1.6;">Hi ${userName},</p>
          
          <p style="color: #333; line-height: 1.6;">
            Your <strong>${planType.charAt(0).toUpperCase() + planType.slice(1)}</strong> subscription is now active! 
            You now have access to all premium features.
          </p>
          
          <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #00BFFF; margin: 0 0 15px 0;">Subscription Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Plan:</td>
                <td style="padding: 8px 0; color: #333;">${planType.charAt(0).toUpperCase() + planType.slice(1)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Amount:</td>
                <td style="padding: 8px 0; color: #333;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 500;">Renews:</td>
                <td style="padding: 8px 0; color: #333;">${expiresAt}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://verrsa.org" style="display: inline-block; background-color: #00BFFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Explore Your Features
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
              Need help? Contact us at <a href="mailto:hello@verrsa.org" style="color: #00BFFF;">hello@verrsa.org</a>
            </p>
            
            <div style="margin-top: 20px;">
              <a href="https://play.google.com/store/apps/details?id=com.verrsa.app" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/google-play.png" alt="Get it on Google Play" style="height: 40px; border-radius: 5px;" />
              </a>
              <a href="https://apps.apple.com/us/app/verrsa/id6756518229" target="_blank" style="display: inline-block; margin: 0 10px;">
                <img src="https://ik.imagekit.io/te9biwxvl/app-store.png" alt="Download on App Store" style="height: 40px; border-radius: 5px;" />
              </a>
            </div>
            
            <p style="margin-top: 15px;">
              <a href="https://www.verrsa.org" target="_blank" style="color: #00bfff; text-decoration: underline;">www.verrsa.org</a>
            </p>
            
            <div style="background-color: #00bfff; height: 4px; border-radius: 2px; margin-top: 30px;"></div>
            <p style="font-size: 12px; color: #aaa; margin-top: 12px;">
              You received this email from Verrsa. &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `,
    textContent: `
      Welcome to ${planType.toUpperCase()} Subscription!
      
      Hi ${userName},
      
      Your subscription is now active!
      
      Plan: ${planType.charAt(0).toUpperCase() + planType.slice(1)}
      Amount: $${amount.toFixed(2)}
      Renews: ${expiresAt}
      
      Visit https://verrsa.org to explore your features.
      
      Need help? Contact us at hello@verrsa.org
      &copy; ${new Date().getFullYear()} Verrsa. All rights reserved.
    `,
  }),
};

// SendGrid Email Service
class SendGridEmailService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = SENDGRID_API_URL;
  }

  async sendEmail(
    template: EmailTemplate,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use secure server-side API
      await sendSecureEmail({
        to: template.to,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      console.log(`✅ Email sent successfully to ${template.to}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Email send failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBulkEmails(templates: EmailTemplate[]): Promise<{
    success: boolean;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];
    let overallSuccess = true;

    for (const template of templates) {
      const result = await this.sendEmail(template);
      results.push({
        email: template.to,
        success: result.success,
        error: result.error,
      });

      if (!result.success) {
        overallSuccess = false;
      }

      // Add small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: overallSuccess,
      results,
    };
  }
}

// Export singleton instance
export const emailService = new SendGridEmailService();

// Export utility functions
export const sendPasswordResetNotifications = async (
  userEmail: string,
): Promise<{ success: boolean; errors: string[] }> => {
  const timestamp = new Date().toLocaleString();
  const errors: string[] = [];

  const adminTemplate = emailTemplates.adminPasswordReset(userEmail, timestamp);
  const result = await emailService.sendEmail(adminTemplate);

  if (!result.success && result.error) {
    errors.push(`Failed to send email to ${adminTemplate.to}: ${result.error}`);
  }

  return {
    success: result.success,
    errors,
  };
};

// Send subscription payment notification to admin
export const sendSubscriptionPaymentNotification = async (
  userEmail: string,
  planName: string,
  amount: number,
  currency: string,
  paymentReference: string,
): Promise<{ success: boolean; error?: string }> => {
  const timestamp = new Date().toLocaleString();
  const template = emailTemplates.subscriptionPayment(
    userEmail,
    planName,
    amount,
    currency,
    paymentReference,
    timestamp,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send ad payment notification to admin
export const sendAdPaymentNotification = async (
  userEmail: string,
  adType: string,
  amount: number,
  currency: string,
  paymentReference: string,
  duration: string,
): Promise<{ success: boolean; error?: string }> => {
  const timestamp = new Date().toLocaleString();
  const template = emailTemplates.adPayment(
    userEmail,
    adType,
    amount,
    currency,
    paymentReference,
    duration,
    timestamp,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send new user signup notification to admin
export const sendNewSignupNotification = async (
  userEmail: string,
  userName: string,
  username: string,
): Promise<{ success: boolean; error?: string }> => {
  const timestamp = new Date().toLocaleString();
  const template = emailTemplates.adminNewSignup(
    userEmail,
    userName,
    username,
    timestamp,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send welcome email to the user on signup
export const sendUserWelcomeEmail = async (
  userEmail: string,
  userName: string,
  username: string,
): Promise<{ success: boolean; error?: string }> => {
  const template = emailTemplates.userWelcomeSignup(
    userEmail,
    userName,
    username,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send live stream notification to admin
export const sendLiveStreamNotification = async (
  userEmail: string,
  userName: string,
  username: string,
  communityId: string,
  liveStreamId: string,
): Promise<{ success: boolean; error?: string }> => {
  const timestamp = new Date().toLocaleString();
  const template = emailTemplates.liveStreamStarted(
    userEmail,
    userName,
    username,
    communityId,
    liveStreamId,
    timestamp,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send content report notification to admin
export const sendContentReportNotification = async (
  reporterEmail: string,
  contentType: string,
  violationType: string,
  reason: string,
  contentId: string,
  reportedUserEmail: string | null,
): Promise<{ success: boolean; error?: string }> => {
  const timestamp = new Date().toLocaleString();
  const template = emailTemplates.contentReport(
    reporterEmail,
    contentType,
    violationType,
    reason,
    contentId,
    reportedUserEmail,
    timestamp,
  );

  const result = await emailService.sendEmail(template);
  return result;
};

// Send subscription confirmation email to user
export const sendSubscriptionConfirmationEmail = async (
  userEmail: string,
  userName: string,
  planType: string,
  amount: number,
  expiresAt: string,
): Promise<{ success: boolean; error?: string }> => {
  const template = emailTemplates.subscriptionConfirmation(
    userEmail,
    userName,
    planType,
    amount,
    expiresAt,
  );

  const result = await emailService.sendEmail(template);
  return result;
};
