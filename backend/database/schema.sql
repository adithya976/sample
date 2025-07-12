-- Skill Swap Platform Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS swap_feedback CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS admin_messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS skill_categories CASCADE;

-- Create skill categories table
CREATE TABLE skill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    profile_photo VARCHAR(255),
    availability TEXT, -- JSON string for availability schedule
    is_public BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create skills table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES skill_categories(id),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_skills table (junction table for users and skills)
CREATE TABLE user_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    skill_type VARCHAR(20) NOT NULL CHECK (skill_type IN ('offered', 'wanted')),
    experience_level VARCHAR(20) DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id, skill_type)
);

-- Create swap_requests table
CREATE TABLE swap_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requester_skill_id INTEGER REFERENCES skills(id),
    provider_skill_id INTEGER REFERENCES skills(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    message TEXT,
    proposed_schedule TEXT, -- JSON string for proposed meeting times
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create swap_feedback table
CREATE TABLE swap_feedback (
    id SERIAL PRIMARY KEY,
    swap_request_id INTEGER REFERENCES swap_requests(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(swap_request_id, reviewer_id)
);

-- Create admin_messages table
CREATE TABLE admin_messages (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'announcement', 'maintenance')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_public ON users(is_public);
CREATE INDEX idx_users_is_banned ON users(is_banned);
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category_id);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill_id);
CREATE INDEX idx_user_skills_type ON user_skills(skill_type);
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_provider ON swap_requests(provider_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_feedback_swap ON swap_feedback(swap_request_id);
CREATE INDEX idx_admin_messages_active ON admin_messages(is_active);

-- Insert default skill categories
INSERT INTO skill_categories (name, description) VALUES
('Technology', 'Programming, web development, software engineering, IT support'),
('Design', 'Graphic design, UI/UX, photography, video editing'),
('Business', 'Marketing, sales, finance, project management'),
('Languages', 'Foreign languages, translation, interpretation'),
('Creative', 'Writing, music, art, crafts'),
('Health & Fitness', 'Personal training, yoga, nutrition, wellness'),
('Education', 'Tutoring, teaching, academic subjects'),
('Trades', 'Carpentry, plumbing, electrical, mechanical'),
('Communication', 'Public speaking, presentation skills, networking'),
('Other', 'Skills that don\'t fit into other categories');

-- Insert some default skills
INSERT INTO skills (name, description, category_id) VALUES
('JavaScript', 'Programming language for web development', 1),
('Python', 'Programming language for data science and web development', 1),
('React', 'Frontend JavaScript library for building user interfaces', 1),
('Node.js', 'JavaScript runtime for server-side development', 1),
('Photoshop', 'Adobe photo editing software', 2),
('UI/UX Design', 'User interface and user experience design', 2),
('Digital Marketing', 'Online marketing and advertising', 3),
('Spanish', 'Spanish language skills', 4),
('Guitar', 'Playing guitar and music theory', 5),
('Yoga', 'Yoga practice and instruction', 6),
('Excel', 'Microsoft Excel spreadsheet skills', 3),
('Public Speaking', 'Presentation and communication skills', 9);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_categories_updated_at BEFORE UPDATE ON skill_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at BEFORE UPDATE ON swap_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();