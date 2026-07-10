import axios from 'axios';

import config from '../config/index.js';

/**
 * Preconfigured Axios instance for all backend API calls.
 * Endpoint-specific request functions will be added in `src/services/`
 * in a future milestone.
 */
const axiosClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const meetingId = sessionStorage.getItem('sherlock_meeting_id');
    if (meetingId) {
      config.headers['X-Meeting-ID'] = meetingId;
    }
  }
  return config;
});

export default axiosClient;
