import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import axios from 'axios';
import {MESSAGES} from '../locale/en.js';
import dotenv from 'dotenv';
dotenv.config();
// Ensure the environment variables are defined
const { SENDGRID_API_KEY, FIREBASE_WEB_API_KEY, EMAIL } = process.env;

if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not defined');
}

if (!EMAIL) {
    throw new Error('EMAIL is not defined');
}

if (!FIREBASE_WEB_API_KEY) {
    throw new Error('FIREBASE_WEB_API_KEY is not defined');
}

// Configure SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

// Function to generate OTP
const generateOtp = () => {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = crypto.randomInt(0, digits.length); // Generate random index within digits length
        otp += digits[randomIndex]; // Append random digit from digits array
    }

    return otp;
};

// Function to send OTP email
const sendOtpEmail = async (email, otp) => {
    const mailOptions = {
        from: EMAIL,
        to: email,
        subject: MESSAGES.OTP_EMAIL_SUBJECT,
        text: MESSAGES.OTP_EMAIL_TEXT.replace('{otp}', otp),
    };

    await sgMail.send(mailOptions);
};

// Function to send custom verification email
const sendCustomVerificationEmail = async (email, link) => {
    const mailOptions = {
        from: EMAIL,
        to: email,
        subject: MESSAGES.VERIFICATION_EMAIL_SUBJECT,
        text: MESSAGES.VERIFICATION_EMAIL_TEXT.replace('{link}', link),
    };

    await sgMail.send(mailOptions);
};

// Function to sign in with Firebase
const signInWithFirebase = async (email, password) => {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    try {
        const response = await axios.post(url, {
            email,
            password,
            returnSecureToken: true
        });
        return response.data;
    } catch (error) {
        console.error('Firebase sign-in error:', error.response.data.error.message);
        return null; // Return null or undefined if sign-in fails
    }
};

// Function to send custom email
const sendCustomEmail = async (email, subject, text) => {
    const mailOptions = {
        from: EMAIL,
        to: email,
        subject,
        text,
    };

    await sgMail.send(mailOptions);
};

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
    const subject = MESSAGES.PASSWORD_RESET_SUBJECT;
    const text = MESSAGES.PASSWORD_RESET_TEXT.replace('{resetLink}', resetLink);
    await sendCustomEmail(email, subject, text);
};

// Function to send subscription reminder email
const sendSubscriptionReminderEmail = async (email, days) => {
    const subject = `Reminder: Your subscription is expiring in ${days} days!`;
    const text = `Dear User,\n\nThis is a reminder that your subscription will expire in ${days} days. Please renew your plan to avoid any interruption in service.\n\nBest regards,\nYour Company`;
    
    const mailOptions = {
        from: EMAIL,
        to: email,
        subject,
        text,
    };

    await sgMail.send(mailOptions);
};

export {
    generateOtp,
    sendOtpEmail,
    sendCustomVerificationEmail,
    signInWithFirebase,
    sendCustomEmail,
    sendPasswordResetEmail,
    sendSubscriptionReminderEmail
};
