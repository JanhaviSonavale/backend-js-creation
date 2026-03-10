import nodemailer from 'nodemailer'
import userModel from '../models/userModel.js'

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
}

const sendEmail = async (to, subject, html, logMessage) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log("SMTP credentials missing. Email not sent.")
            console.log(`Draft ${subject} for ${to}`)
            return false
        }

        const transporter = createTransporter()
        const mailOptions = {
            from: process.env.SMTP_USER,
            to,
            subject,
            html,
        }

        await transporter.sendMail(mailOptions)
        console.log(logMessage || `Email sent to ${to}`)
        return true
    } catch (error) {
        console.log(`Error sending email to ${to}:`, error)
        return false
    }
}

const sendOrderConfirmationEmail = async (orderId, userId, items, amount, address) => {
    try {
        const user = await userModel.findById(userId)
        if (!user) return

        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${item.price}</td>
            </tr>
        `).join('')

        const subject = `Order Confirmation - #${orderId}`
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #c586a5;">Thank You for Your Order, ${user.name}!</h2>
                <p>We've received your order <strong>#${orderId}</strong> and are getting it ready for shipment.</p>
                
                <h3>Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f9f9f9;">
                            <th style="text-align: left; padding: 10px;">Item</th>
                            <th style="text-align: left; padding: 10px;">Qty</th>
                            <th style="text-align: left; padding: 10px;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <p style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px;">
                    Total Amount: ₹${amount}
                </p>

                <h3>Shipping Address</h3>
                <p>
                    ${address.firstName} ${address.lastName}<br>
                    ${address.street}<br>
                    ${address.city}, ${address.state} - ${address.zipcode}<br>
                    ${address.country}<br>
                    Phone: ${address.phone}
                </p>

                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        `

        await sendEmail(user.email, subject, html, `Order confirmation email sent to ${user.email}`)

    } catch (error) {
        console.log("Error in sendOrderConfirmationEmail:", error)
    }
}

const sendOrderStatusEmail = async (orderId, userId, status) => {
    try {
        const user = await userModel.findById(userId)
        if (!user) return

        const subject = `Order Status Update - #${orderId}`
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #c586a5;">Order Update</h2>
                <p>Hello ${user.name},</p>
                <p>The status of your order <strong>#${orderId}</strong> has been updated to:</p>
                <p style="font-size: 18px; font-weight: bold; color: #c586a5; background: #f9f9f9; padding: 10px; border-radius: 5px; text-align: center;">
                    ${status}
                </p>
                <p>You can track your order status on our website.</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        `

        await sendEmail(user.email, subject, html, `Status update email (${status}) sent to ${user.email}`)
    } catch (error) {
        console.log("Error in sendOrderStatusEmail:", error)
    }
}

const sendWelcomeEmail = async (userId) => {
    try {
        const user = await userModel.findById(userId)
        if (!user) return

        const subject = `Welcome to J&S Store!`
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #c586a5;">Welcome, ${user.name}!</h2>
                <p>Thank you for joining J&S Store. We're excited to have you with us!</p>
                <p>Explore our latest collection and enjoy a seamless shopping experience.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #c586a5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Start Shopping
                    </a>
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        `

        await sendEmail(user.email, subject, html, `Welcome email sent to ${user.email}`)
    } catch (error) {
        console.log("Error in sendWelcomeEmail:", error)
    }
}

export default sendOrderConfirmationEmail
export { sendOrderStatusEmail, sendWelcomeEmail, sendEmail }
