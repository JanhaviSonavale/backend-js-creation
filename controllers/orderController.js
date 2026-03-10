import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import crypto from 'crypto'
import sendOrderConfirmationEmail, { sendOrderStatusEmail } from "../utils/emailUtils.js";

// global variables
const currency = 'inr'
const deliveryCharge = 10

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

        // Send confirmation email (Automatic)
        console.log(`Triggering automatic order confirmation email for orderId: ${newOrder._id}`)
        await sendOrderConfirmationEmail(newOrder._id, userId, items, amount, address)

        res.json({ success: true, message: "Order Placed", orderId: newOrder._id })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// Placing orders using Stripe Method
const placeOrderStripe = async (req, res) => {
    try {

        const { userId, items, amount, address } = req.body
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Verify Stripe 
const verifyStripe = async (req, res) => {

    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            const order = await orderModel.findByIdAndUpdate(orderId, { payment: true });
            await userModel.findByIdAndUpdate(userId, { cartData: {} })

            // Send confirmation email (Automatic)
            if (order) {
                console.log(`Triggering automatic order confirmation email for Stripe orderId: ${orderId}`)
                await sendOrderConfirmationEmail(orderId, userId, order.items, order.amount, order.address)
            }

            res.json({ success: true });
        } else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({ success: false })
        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

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

const verifyRazorpay = async (req,res) => {
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

                // Send confirmation email (Automatic)
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
        res.json({success:false,message:error.message})
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

// User Order Data For Forntend
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

// update order status from Admin Panel
const updateStatus = async (req, res) => {
    try {

        const { orderId, status } = req.body

        const order = await orderModel.findByIdAndUpdate(orderId, { status })

        // Send status update email (Automatic)
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

// check if user has ordered a specific product
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