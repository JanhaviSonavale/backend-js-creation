import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import razorpay from 'razorpay'
import crypto from 'crypto'
import sendOrderConfirmationEmail, { sendOrderStatusEmail } from "../utils/emailUtils.js";

// global variables
const currency = 'inr'
const deliveryCharge = 10

// gateway initialize
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Placing orders using COD Method
const placeOrder = async (req, res) => {
    try {
        console.log("Request Body in placeOrder:", req.body)
        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId, { cartData: {} })

        console.log(`Triggering automatic order confirmation email for orderId: ${newOrder._id}`)
        await sendOrderConfirmationEmail(newOrder._id, userId, items, amount, address)

        res.json({ success: true, message: "Order Placed", orderId: newOrder._id })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Stripe not available
const placeOrderStripe = async (req, res) => {
    res.json({ success: false, message: "Stripe not available" })
}

const verifyStripe = async (req, res) => {
    res.json({ success: false, message: "Stripe not available" })
}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt: newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error)
                return res.json({ success: false, message: error })
            }
            res.json({ success: true, order })
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyRazorpay = async (req, res) => {
    try {
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
            if (orderInfo.status === 'paid' || orderInfo.status === 'processed') {
                const orderId = orderInfo.receipt;
                const order = await orderModel.findByIdAndUpdate(orderId, { payment: true });
                await userModel.findByIdAndUpdate(userId, { cartData: {} })

                if (order) {
                    console.log(`Triggering automatic order confirmation email for Razorpay receipt: ${orderId}`)
                    await sendOrderConfirmationEmail(orderId, userId, order.items, order.amount, order.address)
                }

                res.json({ success: true, message: "Payment Successful", orderId: orderId })
            } else {
                res.json({ success: false, message: 'Payment Internal Status Error' });
            }
        } else {
            res.json({ success: false, message: 'Payment Verification Failed' });
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({})
        res.json({ success: true, orders })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// User Order Data For Frontend
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body
        const orders = await orderModel.find({ userId })
        res.json({ success: true, orders })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Update order status from Admin Panel
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body
        const order = await orderModel.findByIdAndUpdate(orderId, { status })

        if (order) {
            console.log(`Triggering automatic status update email (${status}) for orderId: ${orderId}`)
            await sendOrderStatusEmail(orderId, order.userId, status)
        }

        res.json({ success: true, message: 'Status Updated' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Check if user has ordered a specific product
const checkUserOrderedProduct = async (req, res) => {
    try {
        const { userId, productId } = req.body
        const orders = await orderModel.find({ userId })
        const hasOrdered = orders.some(order =>
            order.items.some(item => item.productId === productId)
        )
        res.json({ success: true, hasOrdered })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export { verifyRazorpay, verifyStripe, placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, checkUserOrderedProduct }