import axios from 'axios';

const BASE_URL = '/api/upload';

const request = axios.create({
  baseURL: BASE_URL,
});

export default request;
