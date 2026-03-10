import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    productId: { type: String, default: "" },
    date: { type: Number, default: Date.now }
})

const feedbackModel = mongoose.models.feedback || mongoose.model("feedback", feedbackSchema);

export default feedbackModel
