-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'DRIVER', 'HOST', 'DISPATCHER', 'SUPPORT', 'MODERATOR', 'ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('REFRESH_TOKEN', 'API_KEY', 'WHATSAPP_WEBHOOK');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('TRIP_REQUEST', 'TRIP_CONFIRMATION', 'TRIP_CANCELLATION', 'EXPERIENCE_REQUEST', 'EXPERIENCE_CONFIRMATION', 'MESSAGE', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExperienceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'VAN', 'PICKUP', 'OFF_ROAD', 'LUXURY', 'MOTORCYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRIP_CREATED', 'TRIP_AVAILABLE', 'TRIP_ASSIGNED', 'TRIP_ACCEPTED', 'TRIP_REJECTED', 'TRIP_CANCELLED', 'TRIP_IN_PROGRESS', 'TRIP_COMPLETED', 'TRIP_DRIVER_ARRIVED', 'TRIP_REASSIGNED', 'EXPERIENCE_CREATED', 'RESERVATION_CREATED', 'RESERVATION_CONFIRMED', 'RESERVATION_CANCELLED', 'RESERVATION_IN_PROGRESS', 'RESERVATION_COMPLETED', 'EXPERIENCE_REMINDER', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'PAYMENT_RECEIVED', 'REVIEW_RECEIVED', 'REVIEW_PENDING', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'REVIEW_REPORTED', 'VEHICLE_VERIFIED', 'VEHICLE_REJECTED', 'VEHICLE_EXPIRING', 'PROFILE_UPDATED', 'EMAIL_VERIFIED', 'ACCOUNT_LINKED', 'ACCOUNT_UNLINKED', 'PASSWORD_CHANGED', 'LOGIN_NEW_DEVICE', 'LOGIN_SUSPICIOUS', 'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_UPDATED', 'SUPPORT_TICKET_RESOLVED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED', 'CONTENT_REPORTED', 'USER_SUSPENDED', 'USER_VERIFIED', 'USER_REJECTED', 'TRIP_UNASSIGNED', 'DRIVER_UNAVAILABLE', 'HIGH_DEMAND', 'SYSTEM_ALERT', 'SYSTEM_MAINTENANCE', 'SYSTEM_UPDATE', 'NEW_FEATURE', 'SECURITY_ALERT', 'PERFORMANCE_ALERT', 'PROMOTION', 'ANNOUNCEMENT', 'WELCOME', 'REMINDER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'FACEBOOK', 'APPLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PASSENGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tokenType" TEXT,
    "scope" TEXT,
    "idToken" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_numbers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "whatsappNumberId" TEXT NOT NULL,
    "userId" TEXT,
    "tripId" TEXT,
    "experienceId" TEXT,
    "reservationId" TEXT,
    "type" "InteractionType" NOT NULL,
    "direction" "InteractionDirection" NOT NULL,
    "messageId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InteractionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "licensePlate" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "types" TEXT[],
    "city" TEXT,
    "country" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "metadata" JSONB,
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "originPlaceId" TEXT NOT NULL,
    "destinationPlaceId" TEXT NOT NULL,
    "travelMode" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "distanceText" TEXT NOT NULL,
    "durationText" TEXT NOT NULL,
    "polyline" TEXT,
    "bounds" JSONB,
    "waypoints" JSONB,
    "metadata" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "passengerId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "whatsappNumberId" TEXT,
    "originAddress" TEXT NOT NULL,
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationLatitude" DOUBLE PRECISION NOT NULL,
    "destinationLongitude" DOUBLE PRECISION NOT NULL,
    "originPlaceId" TEXT,
    "destinationPlaceId" TEXT,
    "routeId" TEXT,
    "distance" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "distanceText" TEXT NOT NULL,
    "durationText" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "routePolyline" TEXT,
    "routeBounds" JSONB,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "distancePrice" DOUBLE PRECISION NOT NULL,
    "timePrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "durationDays" INTEGER NOT NULL,
    "durationHours" INTEGER,
    "startLocation" JSONB NOT NULL,
    "endLocation" JSONB,
    "waypoints" JSONB,
    "startPlaceId" TEXT,
    "endPlaceId" TEXT,
    "waypointPlaceIds" TEXT[],
    "basePrice" DOUBLE PRECISION NOT NULL,
    "pricePerPerson" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "includes" TEXT[],
    "status" "ExperienceStatus" NOT NULL DEFAULT 'DRAFT',
    "maxParticipants" INTEGER NOT NULL DEFAULT 4,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "photos" TEXT[],
    "itinerary" JSONB,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "whatsappNumberId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "passengerName" TEXT NOT NULL,
    "passengerPhone" TEXT NOT NULL,
    "passengerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tripId" TEXT,
    "reservationId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paymentMethodDetails" JSONB,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewedUserId" TEXT NOT NULL,
    "tripId" TEXT,
    "experienceId" TEXT,
    "reservationId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "channels" "NotificationChannel"[],
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "accounts_provider_idx" ON "accounts"("provider");

-- CreateIndex
CREATE INDEX "accounts_providerAccountId_idx" ON "accounts"("providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");

-- CreateIndex
CREATE INDEX "tokens_userId_idx" ON "tokens"("userId");

-- CreateIndex
CREATE INDEX "tokens_token_idx" ON "tokens"("token");

-- CreateIndex
CREATE INDEX "tokens_type_idx" ON "tokens"("type");

-- CreateIndex
CREATE INDEX "tokens_isActive_idx" ON "tokens"("isActive");

-- CreateIndex
CREATE INDEX "tokens_expiresAt_idx" ON "tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_numbers_phoneNumber_key" ON "whatsapp_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_numbers_userId_idx" ON "whatsapp_numbers"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_numbers_phoneNumber_idx" ON "whatsapp_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_numbers_isActive_idx" ON "whatsapp_numbers"("isActive");

-- CreateIndex
CREATE INDEX "interactions_whatsappNumberId_idx" ON "interactions"("whatsappNumberId");

-- CreateIndex
CREATE INDEX "interactions_userId_idx" ON "interactions"("userId");

-- CreateIndex
CREATE INDEX "interactions_phoneNumber_idx" ON "interactions"("phoneNumber");

-- CreateIndex
CREATE INDEX "interactions_type_idx" ON "interactions"("type");

-- CreateIndex
CREATE INDEX "interactions_status_idx" ON "interactions"("status");

-- CreateIndex
CREATE INDEX "interactions_createdAt_idx" ON "interactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "vehicles_userId_idx" ON "vehicles"("userId");

-- CreateIndex
CREATE INDEX "vehicles_licensePlate_idx" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "vehicles_type_idx" ON "vehicles"("type");

-- CreateIndex
CREATE INDEX "vehicles_isAvailable_idx" ON "vehicles"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "places_placeId_key" ON "places"("placeId");

-- CreateIndex
CREATE INDEX "places_placeId_idx" ON "places"("placeId");

-- CreateIndex
CREATE INDEX "places_latitude_longitude_idx" ON "places"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "places_formattedAddress_idx" ON "places"("formattedAddress");

-- CreateIndex
CREATE INDEX "places_lastFetched_idx" ON "places"("lastFetched");

-- CreateIndex
CREATE INDEX "locations_userId_idx" ON "locations"("userId");

-- CreateIndex
CREATE INDEX "locations_placeId_idx" ON "locations"("placeId");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "routes_originPlaceId_idx" ON "routes"("originPlaceId");

-- CreateIndex
CREATE INDEX "routes_destinationPlaceId_idx" ON "routes"("destinationPlaceId");

-- CreateIndex
CREATE INDEX "routes_travelMode_idx" ON "routes"("travelMode");

-- CreateIndex
CREATE INDEX "routes_lastCalculated_idx" ON "routes"("lastCalculated");

-- CreateIndex
CREATE UNIQUE INDEX "routes_originPlaceId_destinationPlaceId_travelMode_key" ON "routes"("originPlaceId", "destinationPlaceId", "travelMode");

-- CreateIndex
CREATE UNIQUE INDEX "trips_tripNumber_key" ON "trips"("tripNumber");

-- CreateIndex
CREATE INDEX "trips_passengerId_idx" ON "trips"("passengerId");

-- CreateIndex
CREATE INDEX "trips_driverId_idx" ON "trips"("driverId");

-- CreateIndex
CREATE INDEX "trips_vehicleId_idx" ON "trips"("vehicleId");

-- CreateIndex
CREATE INDEX "trips_originPlaceId_idx" ON "trips"("originPlaceId");

-- CreateIndex
CREATE INDEX "trips_destinationPlaceId_idx" ON "trips"("destinationPlaceId");

-- CreateIndex
CREATE INDEX "trips_routeId_idx" ON "trips"("routeId");

-- CreateIndex
CREATE INDEX "trips_tripNumber_idx" ON "trips"("tripNumber");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_scheduledAt_idx" ON "trips"("scheduledAt");

-- CreateIndex
CREATE INDEX "trips_createdAt_idx" ON "trips"("createdAt");

-- CreateIndex
CREATE INDEX "experiences_hostId_idx" ON "experiences"("hostId");

-- CreateIndex
CREATE INDEX "experiences_vehicleId_idx" ON "experiences"("vehicleId");

-- CreateIndex
CREATE INDEX "experiences_startPlaceId_idx" ON "experiences"("startPlaceId");

-- CreateIndex
CREATE INDEX "experiences_endPlaceId_idx" ON "experiences"("endPlaceId");

-- CreateIndex
CREATE INDEX "experiences_status_idx" ON "experiences"("status");

-- CreateIndex
CREATE INDEX "experiences_createdAt_idx" ON "experiences"("createdAt");

-- CreateIndex
CREATE INDEX "experiences_title_idx" ON "experiences"("title");

-- CreateIndex
CREATE INDEX "reservations_experienceId_idx" ON "reservations"("experienceId");

-- CreateIndex
CREATE INDEX "reservations_passengerId_idx" ON "reservations"("passengerId");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_startDate_idx" ON "reservations"("startDate");

-- CreateIndex
CREATE INDEX "reservations_createdAt_idx" ON "reservations"("createdAt");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_tripId_idx" ON "payments"("tripId");

-- CreateIndex
CREATE INDEX "payments_reservationId_idx" ON "payments"("reservationId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_reviewedUserId_idx" ON "reviews"("reviewedUserId");

-- CreateIndex
CREATE INDEX "reviews_tripId_idx" ON "reviews"("tripId");

-- CreateIndex
CREATE INDEX "reviews_experienceId_idx" ON "reviews"("experienceId");

-- CreateIndex
CREATE INDEX "reviews_reservationId_idx" ON "reviews"("reservationId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_type_idx" ON "notification_preferences"("type");

-- CreateIndex
CREATE INDEX "notification_preferences_channel_idx" ON "notification_preferences"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_type_channel_key" ON "notification_preferences"("userId", "type", "channel");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_originPlaceId_fkey" FOREIGN KEY ("originPlaceId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_destinationPlaceId_fkey" FOREIGN KEY ("destinationPlaceId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_originPlaceId_fkey" FOREIGN KEY ("originPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_destinationPlaceId_fkey" FOREIGN KEY ("destinationPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_startPlaceId_fkey" FOREIGN KEY ("startPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_endPlaceId_fkey" FOREIGN KEY ("endPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewedUserId_fkey" FOREIGN KEY ("reviewedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
