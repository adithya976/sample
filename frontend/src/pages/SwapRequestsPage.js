import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const SwapRequestsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Swap Requests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Swap requests page is under construction. You can manage your incoming and outgoing swap requests here.
        </Typography>
      </Box>
    </Container>
  );
};

export default SwapRequestsPage;