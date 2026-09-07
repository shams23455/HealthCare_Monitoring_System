-- Livestock Health Monitoring and Disease Escalation System Schema
-- PostgreSQL DDL Script

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if exists (for clean migration)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS escalations CASCADE;
DROP TABLE IF EXISTS expert_reviews CASCADE;
DROP TABLE IF EXISTS disease_predictions CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS observation_symptoms CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS symptoms CASCADE;
DROP TABLE IF EXISTS animals CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('FARMER', 'EXPERT', 'ADMIN')),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ANIMALS TABLE
CREATE TABLE animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal_tag VARCHAR(100) NOT NULL,
    species VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    sex VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    age_stage VARCHAR(50) NOT NULL,
    farm_location VARCHAR(255) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_farmer_animal_tag UNIQUE(farmer_id, animal_tag)
);

CREATE INDEX idx_animals_farmer ON animals(farmer_id);
CREATE INDEX idx_animals_species ON animals(species);
CREATE INDEX idx_animals_tag ON animals(animal_tag);
CREATE INDEX idx_animals_active ON animals(is_active);

-- SYMPTOMS TABLE
CREATE TABLE symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symptoms_name ON symptoms(name);
CREATE INDEX idx_symptoms_active ON symptoms(is_active);

-- OBSERVATIONS TABLE
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_observation_id VARCHAR(100),
    animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_symptom_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observation_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    symptoms_description JSONB DEFAULT '[]'::jsonb,
    temperature NUMERIC(4,1),
    temperature_unit VARCHAR(10) DEFAULT 'C' NOT NULL,
    appetite_status VARCHAR(50) NOT NULL,
    activity_status VARCHAR(50) NOT NULL,
    farm_location VARCHAR(255),
    animal_location VARCHAR(255),
    age_stage VARCHAR(50),
    notes TEXT,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_farmer_client_observation UNIQUE (recorded_by, client_observation_id)
);

CREATE INDEX idx_observations_client_id ON observations(client_observation_id);
CREATE INDEX idx_observations_animal ON observations(animal_id);
CREATE INDEX idx_observations_recorded_by ON observations(recorded_by);
CREATE INDEX idx_observations_first_symptom ON observations(first_symptom_at);
CREATE INDEX idx_observations_risk ON observations(risk_level);
CREATE INDEX idx_observations_date ON observations(observation_date DESC);

-- OBSERVATION_SYMPTOMS TABLE
CREATE TABLE observation_symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    symptom_id UUID REFERENCES symptoms(id) ON DELETE SET NULL,
    symptom_name VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'Moderate' NOT NULL,
    duration VARCHAR(50) DEFAULT 'Unknown' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_obs_symptoms_obs ON observation_symptoms(observation_id);
CREATE INDEX idx_obs_symptoms_symp ON observation_symptoms(symptom_id);

-- IMAGES TABLE
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    image_type VARCHAR(50) DEFAULT 'BODY',
    captured_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    upload_status VARCHAR(50) DEFAULT 'PENDING' CHECK (upload_status IN ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_observation ON images(observation_id);

-- DISEASE_PREDICTIONS TABLE
CREATE TABLE disease_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    predicted_condition VARCHAR(255) NOT NULL,
    confidence_score NUMERIC(3,2) NOT NULL,
    prediction_source VARCHAR(100) DEFAULT 'RULE_ENGINE',
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_observation ON disease_predictions(observation_id);

-- EXPERT_REVIEWS TABLE
CREATE TABLE expert_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    expert_id UUID REFERENCES users(id) ON DELETE SET NULL,
    diagnosis VARCHAR(255),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED', 'INCONCLUSIVE')),
    comments TEXT,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_reviews_observation ON expert_reviews(observation_id);
CREATE INDEX idx_reviews_expert ON expert_reviews(expert_id);
CREATE INDEX idx_reviews_status ON expert_reviews(validation_status);

-- ESCALATIONS TABLE
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
    escalated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_escalations_observation ON escalations(observation_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_priority ON escalations(priority);

-- AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
