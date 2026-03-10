import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import feedbackRouter from './routes/feedbackRoute.js'

// App Config
const app = express()
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        process.env.FRONTEND_URL
    ].filter(Boolean)
}))

// api endpoints
app.use('/api/user', userRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)
app.use('/api/feedback', feedbackRouter)

app.get('/', (req, res) => {
    res.send("API Working")
})

// ✅ ADDED - export for Vercel
export default app

// ✅ CHANGED - only listen locally
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 4000
    app.listen(port, () => console.log('Server started on PORT : ' + port))
}
