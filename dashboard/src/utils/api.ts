import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);
