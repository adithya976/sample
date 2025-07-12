import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Chip,
} from '@mui/material';
import {
  SwapHoriz,
  People,
  School,
  TrendingUp,
  Star,
  Security,
} from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <SwapHoriz sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Skill Exchange',
      description: 'Trade your skills with others in the community. Teach what you know and learn what you need.',
    },
    {
      icon: <People sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Connect with Experts',
      description: 'Find skilled professionals and enthusiasts who can help you grow in your areas of interest.',
    },
    {
      icon: <School sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Continuous Learning',
      description: 'Never stop learning. Discover new skills and expand your knowledge through hands-on exchange.',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Track Progress',
      description: 'Monitor your learning journey and see how your skills improve over time.',
    },
    {
      icon: <Star sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Rate & Review',
      description: 'Build trust in the community through ratings and reviews from your swap partners.',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Safe & Secure',
      description: 'Your privacy and security are our priority. All interactions are monitored and protected.',
    },
  ];

  const popularSkills = [
    'JavaScript', 'Python', 'React', 'UI/UX Design', 'Digital Marketing',
    'Photography', 'Spanish', 'Guitar', 'Cooking', 'Yoga', 'Excel', 'Public Speaking'
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Software Developer',
      content: 'I learned Spanish in exchange for teaching React. Amazing platform!',
      rating: 5,
    },
    {
      name: 'Mike Chen',
      role: 'Designer',
      content: 'Found great mentors here. The skill exchange concept is brilliant.',
      rating: 5,
    },
    {
      name: 'Emma Davis',
      role: 'Marketing Manager',
      content: 'Improved my photography skills while helping others with marketing.',
      rating: 5,
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 12,
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Exchange Skills,
                <br />
                <span style={{ color: '#FFD700' }}>Grow Together</span>
              </Typography>
              <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.9 }}>
                Join our community of learners and experts. Trade your skills, 
                learn new ones, and build meaningful connections.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    backgroundColor: '#FFD700',
                    color: 'black',
                    '&:hover': {
                      backgroundColor: '#FFC107',
                    },
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: '#FFD700',
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    },
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Sign In
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <Paper
                  elevation={8}
                  sx={{
                    p: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 4,
                    maxWidth: 400,
                  }}
                >
                  <Typography variant="h6" color="primary" gutterBottom>
                    🎯 Popular Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {popularSkills.slice(0, 8).map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        variant="outlined"
                        size="small"
                        sx={{ borderColor: 'primary.main' }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Why Choose SkillSwap?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Discover the benefits of skill exchange and join thousands of learners worldwide
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  textAlign: 'center',
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Testimonials Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            What Our Users Say
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
            Real stories from our community members
          </Typography>
          
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} sx={{ color: '#FFD700', fontSize: 20 }} />
                      ))}
                    </Box>
                    <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                      "{testimonial.content}"
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {testimonial.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {testimonial.role}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ backgroundColor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="h3" component="h2" gutterBottom>
              Ready to Start Your Journey?
            </Typography>
            <Typography variant="h6" paragraph sx={{ mb: 4 }}>
              Join thousands of learners and experts in our skill exchange community
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                backgroundColor: '#FFD700',
                color: 'black',
                '&:hover': {
                  backgroundColor: '#FFC107',
                },
                px: 6,
                py: 2,
                fontSize: '1.1rem',
              }}
            >
              Join SkillSwap Today
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;