-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'ORG_ADMIN', 'PROMPT_REVIEWER', 'DOCTOR', 'EDUCATOR', 'RESEARCHER', 'STUDENT', 'USER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PLATFORM');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('IN_APP', 'OAUTH_REQUIRED', 'API_KEY_REQUIRED', 'EXTERNAL', 'BETA', 'UNAVAILABLE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SafetyClass" AS ENUM ('GENERAL', 'EDUCATIONAL', 'CLINICAL_DRAFT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowExternalAI" BOOLEAN NOT NULL DEFAULT false,
    "seatLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "monthlyExecutions" INTEGER NOT NULL,
    "monthlyCredits" INTEGER NOT NULL,
    "spendLimitCents" INTEGER NOT NULL,
    "features" JSONB NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "status" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approvedForPHI" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthyAt" TIMESTAMP(3),
    "healthDetail" TEXT,

    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProviderConfiguration" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "secretRef" TEXT NOT NULL,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "spendLimitCents" INTEGER,
    "rotatedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProviderConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIProviderModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "contextTokens" INTEGER NOT NULL,
    "maxOutputTokens" INTEGER NOT NULL,
    "inputPer1kUsd" DECIMAL(12,6) NOT NULL,
    "outputPer1kUsd" DECIMAL(12,6) NOT NULL,
    "supportsFiles" BOOLEAN NOT NULL DEFAULT false,
    "supportsStreaming" BOOLEAN NOT NULL DEFAULT false,
    "supportsWebSearch" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pricingVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "AIProviderModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITool" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerId" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "apiDocsUrl" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'EXTERNAL',
    "authMethod" TEXT,
    "inputTypes" TEXT[],
    "outputTypes" TEXT[],
    "languages" TEXT[],
    "eligiblePlans" TEXT[],
    "costMethod" TEXT,
    "fileUpload" BOOLEAN NOT NULL DEFAULT false,
    "streaming" BOOLEAN NOT NULL DEFAULT false,
    "limits" JSONB,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "AITool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIToolCapability" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,

    CONSTRAINT "AIToolCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIToolIntegrationStatus" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIToolIntegrationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,

    CONSTRAINT "PromptCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tags" TEXT[],
    "audience" TEXT[],
    "ownerId" TEXT,
    "orgId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "safetyClass" "SafetyClass" NOT NULL DEFAULT 'GENERAL',
    "currentVersionId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "outputFormat" TEXT,
    "recommendedCapabilities" TEXT[],
    "compatibleProviders" TEXT[],
    "exampleInput" JSONB,
    "exampleOutput" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVariable" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT[],
    "config" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromptVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptReview" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedPrompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPromptCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "UserPromptCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,

    CONSTRAINT "PromptCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWorkspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "AIWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "title" TEXT NOT NULL,
    "toolId" TEXT,
    "promptId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "retainUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "includedInContext" BOOLEAN NOT NULL DEFAULT true,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "providerKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "ExecStatus" NOT NULL DEFAULT 'QUEUED',
    "failureCode" TEXT,
    "devMode" BOOLEAN NOT NULL DEFAULT false,
    "promptId" TEXT,
    "promptVersion" INTEGER,
    "consentedExternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "ExecStatus" NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,

    CONSTRAINT "AIExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRoutingDecision" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskTypes" TEXT[],
    "requiredCapabilities" TEXT[],
    "selectedToolId" TEXT,
    "rejected" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRoutingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWorkflowTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerId" TEXT,
    "orgId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "clinical" BOOLEAN NOT NULL DEFAULT false,
    "definition" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AIWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWorkflowStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dependsOn" TEXT[],
    "condition" JSONB,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,

    CONSTRAINT "AIWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWorkflowRun" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "status" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "estimatedCostCredits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "retainUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "KnowledgeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCollectionDocument" (
    "collectionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeCollectionDocument_pkey" PRIMARY KEY ("collectionId","documentId")
);

-- CreateTable
CREATE TABLE "AIUsageRecord" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "providerKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "taskCategory" TEXT,
    "promptId" TEXT,
    "promptVersion" INTEGER,
    "status" "ExecStatus" NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "actualCostUsd" DECIMAL(12,6),
    "credits" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "kind" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCostRecord" (
    "id" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "reportedCostUsd" DECIMAL(14,6) NOT NULL,
    "estimatedCostUsd" DECIMAL(14,6) NOT NULL,

    CONSTRAINT "ProviderCostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBudgetLimit" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "monthlyLimitCents" INTEGER NOT NULL,
    "alertAtPct" INTEGER NOT NULL DEFAULT 80,

    CONSTRAINT "AIBudgetLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAuditEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "orgId" TEXT,
    "executionId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_orgId_idx" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_key_key" ON "AIProvider"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderConfiguration_providerId_key" ON "AIProviderConfiguration"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderModel_providerId_modelKey_key" ON "AIProviderModel"("providerId", "modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "AITool_slug_key" ON "AITool"("slug");

-- CreateIndex
CREATE INDEX "AITool_category_idx" ON "AITool"("category");

-- CreateIndex
CREATE INDEX "AITool_status_idx" ON "AITool"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AIToolCapability_toolId_capability_key" ON "AIToolCapability"("toolId", "capability");

-- CreateIndex
CREATE INDEX "AIToolIntegrationStatus_toolId_createdAt_idx" ON "AIToolIntegrationStatus"("toolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptCategory_slug_key" ON "PromptCategory"("slug");

-- CreateIndex
CREATE INDEX "PromptTemplate_categoryId_idx" ON "PromptTemplate"("categoryId");

-- CreateIndex
CREATE INDEX "PromptTemplate_ownerId_idx" ON "PromptTemplate"("ownerId");

-- CreateIndex
CREATE INDEX "PromptTemplate_orgId_visibility_idx" ON "PromptTemplate"("orgId", "visibility");

-- CreateIndex
CREATE INDEX "PromptTemplate_status_idx" ON "PromptTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVariable_promptId_key_key" ON "PromptVariable"("promptId", "key");

-- CreateIndex
CREATE INDEX "PromptReview_promptId_idx" ON "PromptReview"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedPrompt_userId_promptId_key" ON "UserSavedPrompt"("userId", "promptId");

-- CreateIndex
CREATE INDEX "UserPromptCollection_userId_idx" ON "UserPromptCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptCollectionItem_collectionId_promptId_key" ON "PromptCollectionItem"("collectionId", "promptId");

-- CreateIndex
CREATE INDEX "AIWorkspace_userId_idx" ON "AIWorkspace"("userId");

-- CreateIndex
CREATE INDEX "AISession_userId_createdAt_idx" ON "AISession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AISession_orgId_idx" ON "AISession"("orgId");

-- CreateIndex
CREATE INDEX "AIMessage_sessionId_createdAt_idx" ON "AIMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_userId_createdAt_idx" ON "AIExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_sessionId_idx" ON "AIExecution"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AIExecutionStep_executionId_position_key" ON "AIExecutionStep"("executionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AIRoutingDecision_executionId_key" ON "AIRoutingDecision"("executionId");

-- CreateIndex
CREATE INDEX "AIRoutingDecision_userId_idx" ON "AIRoutingDecision"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIWorkflowStep_templateId_key_key" ON "AIWorkflowStep"("templateId", "key");

-- CreateIndex
CREATE INDEX "AIWorkflowRun_userId_createdAt_idx" ON "AIWorkflowRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedDocument_userId_idx" ON "UploadedDocument"("userId");

-- CreateIndex
CREATE INDEX "UploadedDocument_orgId_idx" ON "UploadedDocument"("orgId");

-- CreateIndex
CREATE INDEX "KnowledgeCollection_userId_idx" ON "KnowledgeCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageRecord_executionId_key" ON "AIUsageRecord"("executionId");

-- CreateIndex
CREATE INDEX "AIUsageRecord_userId_createdAt_idx" ON "AIUsageRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_orgId_createdAt_idx" ON "AIUsageRecord"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_providerKey_createdAt_idx" ON "AIUsageRecord"("providerKey", "createdAt");

-- CreateIndex
CREATE INDEX "AICreditTransaction_userId_createdAt_idx" ON "AICreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AICreditTransaction_userId_idempotencyKey_kind_key" ON "AICreditTransaction"("userId", "idempotencyKey", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCostRecord_providerKey_periodStart_key" ON "ProviderCostRecord"("providerKey", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AIBudgetLimit_scope_scopeId_key" ON "AIBudgetLimit"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "AIAuditEvent_actorId_createdAt_idx" ON "AIAuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditEvent_orgId_createdAt_idx" ON "AIAuditEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditEvent_type_idx" ON "AIAuditEvent"("type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProviderConfiguration" ADD CONSTRAINT "AIProviderConfiguration_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIProviderModel" ADD CONSTRAINT "AIProviderModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITool" ADD CONSTRAINT "AITool_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIToolCapability" ADD CONSTRAINT "AIToolCapability_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIToolIntegrationStatus" ADD CONSTRAINT "AIToolIntegrationStatus_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PromptCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVariable" ADD CONSTRAINT "PromptVariable_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptReview" ADD CONSTRAINT "PromptReview_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPrompt" ADD CONSTRAINT "UserSavedPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPrompt" ADD CONSTRAINT "UserSavedPrompt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPromptCollection" ADD CONSTRAINT "UserPromptCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptCollectionItem" ADD CONSTRAINT "PromptCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "UserPromptCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptCollectionItem" ADD CONSTRAINT "PromptCollectionItem_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIWorkspace" ADD CONSTRAINT "AIWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AIWorkspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AISession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AISession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecutionStep" ADD CONSTRAINT "AIExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AIExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRoutingDecision" ADD CONSTRAINT "AIRoutingDecision_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AIExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIWorkflowStep" ADD CONSTRAINT "AIWorkflowStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AIWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIWorkflowRun" ADD CONSTRAINT "AIWorkflowRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AIWorkflowTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCollectionDocument" ADD CONSTRAINT "KnowledgeCollectionDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "KnowledgeCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCollectionDocument" ADD CONSTRAINT "KnowledgeCollectionDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

