import express from 'express'
import { submitFeedback, getAllFeedback } from '../controllers/feedbackController.js'
import adminAuth from '../middleware/adminAuth.js'

const feedbackRouter = express.Router();

feedbackRouter.post('/submit', submitFeedback);
feedbackRouter.get('/list', adminAuth, getAllFeedback);

export default feedbackRouter
