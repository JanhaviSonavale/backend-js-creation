import jwt from 'jsonwebtoken'

const authUser = async (req, res, next) => {

    const { token } = req.headers;

    if (!token) {
        return res.json({ success: false, message: 'Not Authorized Login Again' })
    }

    try {

        const token_decode = jwt.verify(token, process.env.JWT_SECRET)
        console.log("Token Decoded:", token_decode)
        if (typeof token_decode === 'object' && token_decode !== null) {
            req.body.userId = token_decode.id || token_decode._id
        } else {
            return res.json({ success: false, message: 'Invalid token data' })
        }
        next()

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

export default authUser