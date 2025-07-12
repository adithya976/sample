import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ProfilePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Profile page is under construction. You can manage your profile information, skills, and settings here.
        </Typography>
      </Box>
    </Container>
  );
};

export default ProfilePage;