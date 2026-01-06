import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  exportIssues,
  changeIssueStatus
} from '../controllers/issueController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createIssue);
router.get('/', getIssues);
router.get('/export', exportIssues);
router.get('/:id', getIssueById);
router.put('/:id', updateIssue);
router.patch('/:id/status', changeIssueStatus);
router.delete('/:id', deleteIssue);

export default router;

