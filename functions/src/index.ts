import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Force redeploy to pick up STRIPE_SECRET_KEY secret - 2025-12-30

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// TypeScript Interfaces for the incoming payload
interface MetricsPayload {
  websiteTraffic?: number;
  siteSpeedSeconds?: number;
  supportHoursRemaining?: number;
  maintenanceHoursRemaining?: number;
}

interface CompanyPayload {
  legalName?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessService?: string;
  serviceArea?: string;
  yearFounded?: string;
  numEmployees?: string;
  websiteUrl?: string;
}

interface NotionWebhookPayload {
  userId: string;
  metrics?: MetricsPayload;
  company?: CompanyPayload;
}

// ============================================================================
// EXISTING FUNCTION: Update Customer from Notion
// ============================================================================
export const updateCustomerFromNotion = onRequest(
  {region: "us-central1", cors: true},
  async (request, response) => {
    logger.debug("--- NEW REQUEST ---");
    logger.debug("Request Headers:", request.headers);
    logger.debug("Request Method:", request.method);
    logger.debug("Request Body:", request.body);

    try {
      if (request.method !== "POST") {
        logger.warn("Request method is not POST.", {method: request.method});
        response.status(405).json({
          success: false,
          error: "Method Not Allowed. Please use POST.",
        });
        return;
      }

      const {
        userId,
        metrics,
        company,
      }: NotionWebhookPayload = request.body;

      logger.debug("Extracted userId:", {userId, type: typeof userId});

      if (!userId) {
        logger.error("Bad Request: userId is missing or empty in payload.", {
          payload: request.body,
        });
        response.status(400).json({
          success: false,
          error: "Bad Request: Missing required 'userId' field.",
        });
        return;
      }

      const userDocRef = db.collection("users").doc(userId);

      logger.debug("Checking for user document...", {userId});
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        logger.error("User document not found.", {userId});
        response.status(404).json({
          success: false,
          error: `User with ID '${userId}' not found.`,
        });
        return;
      }
      logger.debug("User document found.", {userId, exists: userDoc.exists});

      logger.debug("Constructing updateData object...");
      const updateData: {
        [key: string]: string | number | admin.firestore.FieldValue;
      } = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (metrics) {
        logger.debug("Processing metrics payload:", {metrics});
        Object.entries(metrics).forEach(([key, value]) => {
          logger.debug("Processing metrics field:", {
            key,
            value,
            type: typeof value,
          });
          if (value !== undefined && value !== null) {
            updateData[`metrics.${key}`] = value;
          }
        });
      }

      if (company) {
        logger.debug("Processing company payload:", {company});
        Object.entries(company).forEach(([key, value]) => {
          logger.debug("Processing company field:", {
            key,
            value,
            type: typeof value,
          });
          if (value !== undefined && value !== null) {
            updateData[`company.${key}`] = value;
          }
        });
      }

      logger.debug("Final updateData object constructed:", {updateData});

      if (Object.keys(updateData).length <= 1) {
        logger.warn("No new data provided to update.", {userId});
        response.status(200).json({
          success: true,
          message: "Received request, but no new data was provided to update.",
        });
        return;
      }

      try {
        logger.info("Attempting to update Firestore document...", {
          userId,
          updateData,
        });
        await userDocRef.update(updateData);
        logger.info("Successfully updated Firestore document.", {userId});
      } catch (firestoreError: unknown) {
        const err = firestoreError as Error;
        logger.error("!!! Firestore update failed !!!", {
          userId,
          updateData,
          error: err.message,
          stack: err.stack,
        });
        throw err;
      }

      response.status(200).json({
        success: true,
        message: `Successfully updated user '${userId}'.`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(
        "!!! An unexpected error occurred in the main try block !!!",
        {
          error: err.message,
          stack: err.stack,
          requestBody: request.body,
        });
      response.status(500).json({
        success: false,
        error: "Internal Server Error. Please check function logs for details.",
      });
    }
  },
);

// ============================================================================
// NEW FUNCTION: Create Stripe Payment Intent
// ============================================================================
export const createPaymentIntent = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: ["STRIPE_SECRET_KEY"],
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
  },
  async (request, response) => {
    logger.debug("--- CREATE PAYMENT INTENT REQUEST ---");
    logger.debug("Request Body:", request.body);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    try {
      if (request.method !== "POST") {
        response.status(405).json({
          success: false,
          error: "Method Not Allowed. Please use POST.",
        });
        return;
      }

      const {amount, tier, billingCycle} = request.body;

      // Validate required fields
      if (!amount || !tier || !billingCycle) {
        response.status(400).json({
          success: false,
          error: "Missing required fields: amount, tier, billingCycle",
        });
        return;
      }

      logger.info("Creating payment intent", {amount, tier, billingCycle});

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          tier,
          billingCycle,
        },
      });

      logger.info("Payment intent created successfully", {
        paymentIntentId: paymentIntent.id,
      });

      response.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error("Error creating payment intent", {
        error: err.message,
        stack: err.stack,
      });
      response.status(500).json({
        success: false,
        error: "Failed to create payment intent",
      });
    }
  },
);
