import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  People,
  SwapHoriz,
  Star,
  Add,
  Search,
  Notifications,
  Edit,
  PersonAdd,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { swapsAPI, skillsAPI } from '../services/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState({
    requests_sent: 0,
    requests_received: 0,
    completed_swaps: 0,
    pending_swaps: 0,
  });
  const [mySkills, setMySkills] = useState({
    offered_skills: [],
    wanted_skills: [],
  });
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics
        const [statsResponse, skillsResponse, requestsResponse] = await Promise.all([
          swapsAPI.getSwapStatistics(),
          skillsAPI.getMySkills(),
          swapsAPI.getMyRequests({ limit: 5 }),
        ]);

        setStatistics(statsResponse.data.statistics);
        setMySkills(skillsResponse.data);
        setRecentRequests(requestsResponse.data.swap_requests);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const dashboardStats = [
    {
      title: 'Requests Sent',
      value: statistics.requests_sent,
      icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary',
    },
    {
      title: 'Requests Received',
      value: statistics.requests_received,
      icon: <People sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success',
    },
    {
      title: 'Completed Swaps',
      value: statistics.completed_swaps,
      icon: <SwapHoriz sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info',
    },
    {
      title: 'Pending Swaps',
      value: statistics.pending_swaps,
      icon: <Notifications sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning',
    },
  ];

  const quickActions = [
    {
      title: 'Browse Users',
      description: 'Find people with skills you want to learn',
      icon: <Search />,
      action: () => navigate('/browse'),
      color: 'primary',
    },
    {
      title: 'Manage Skills',
      description: 'Add or update your skills',
      icon: <Edit />,
      action: () => navigate('/profile'),
      color: 'secondary',
    },
    {
      title: 'View Requests',
      description: 'Check your swap requests',
      icon: <SwapHoriz />,
      action: () => navigate('/swaps'),
      color: 'info',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={50} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name}! 👋
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Here's your skill exchange overview
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h4" component="div" color={`${stat.color}.main`} gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* My Skills Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              My Skills
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" color="success.main" gutterBottom>
                Skills I Offer ({mySkills.offered_skills.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {mySkills.offered_skills.slice(0, 6).map((skill) => (
                  <Chip
                    key={skill.id}
                    label={skill.name}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                ))}
                {mySkills.offered_skills.length > 6 && (
                  <Chip
                    label={`+${mySkills.offered_skills.length - 6} more`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" color="primary.main" gutterBottom>
                Skills I Want ({mySkills.wanted_skills.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {mySkills.wanted_skills.slice(0, 6).map((skill) => (
                  <Chip
                    key={skill.id}
                    label={skill.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
                {mySkills.wanted_skills.length > 6 && (
                  <Chip
                    label={`+${mySkills.wanted_skills.length - 6} more`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate('/profile')}
              fullWidth
            >
              Manage Skills
            </Button>
          </Paper>
        </Grid>

        {/* Recent Requests */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Requests
            </Typography>
            
            {recentRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent requests
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={() => navigate('/browse')}
                  sx={{ mt: 2 }}
                >
                  Find People to Swap With
                </Button>
              </Box>
            ) : (
              <List>
                {recentRequests.map((request) => (
                  <ListItem key={request.id} divider>
                    <ListItemAvatar>
                      <Avatar>
                        {request.is_requester ? request.provider_name.charAt(0) : request.requester_name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {request.is_requester ? 'To' : 'From'} {request.is_requester ? request.provider_name : request.requester_name}
                          </Typography>
                          <Chip
                            label={request.status}
                            size="small"
                            color={getStatusColor(request.status)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {request.requester_skill_name} ↔ {request.provider_skill_name}
                          <br />
                          {formatDate(request.created_at)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
            
            <Button
              variant="outlined"
              onClick={() => navigate('/swaps')}
              fullWidth
              sx={{ mt: 2 }}
            >
              View All Requests
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: `${action.color}.main`, mr: 2 }}>
                      {action.icon}
                    </Avatar>
                    <Typography variant="h6">
                      {action.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color={action.color}
                    onClick={action.action}
                  >
                    Get Started
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage;