import feedbackModel from "../models/feedbackModel.js";
import productModel from "../models/productModel.js";
import { sendEmail } from "../utils/emailUtils.js";

const submitFeedback = async (req, res) => {
    try {
        const { name, email, subject, message, rating, userId, productId } = req.body;

        const feedbackData = {
            name,
            email,
            subject,
            message,
            rating: Number(rating),
            productId: productId || "",
            userId: userId || null,
            date: Date.now()
        }

        if (userId && userId !== "") {
            feedbackData.userId = userId
        }

        const newFeedback = new feedbackModel(feedbackData);
        await newFeedback.save();

        // If a productId is provided, also add it as a product review
        if (productId && productId !== "") {
            const product = await productModel.findById(productId);
            if (product) {
                const newReview = {
                    user: userId || null, // Can be null for guest reviews if allowed
                    rating: Number(rating),
                    comment: message,
                    name: name // Store the name since this is a review from contact form
                }
                product.reviews.push(newReview);
                await product.save();
            }
        }

        // Send confirmation email to user
        const userHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #c586a5;">Thank You for Your Feedback, ${name}!</h2>
                <p>We've received your message regarding "<strong>${subject}</strong>".</p>
                <p><strong>Your Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</p>
                <p>Our team will review it and get back to you if necessary.</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        `
        await sendEmail(email, "Feedback Received - J&S Store", userHtml, `Feedback confirmation sent to ${email}`);

        // Send notification to admin
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #c586a5;">New Store Feedback</h2>
                <p><strong>From:</strong> ${name} (${email})</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Rating:</strong> ${rating} / 5</p>
                <p><strong>Message:</strong></p>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
            </div>
        `
        await sendEmail(process.env.ADMIN_EMAIL, "New Feedback Received", adminHtml, `Admin notification sent for new feedback`);

        res.json({ success: true, message: "Feedback submitted successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const getAllFeedback = async (req, res) => {
    try {
        const feedback = await feedbackModel.find({}).sort({ date: -1 });
        res.json({ success: true, feedback });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export { submitFeedback, getAllFeedback }
