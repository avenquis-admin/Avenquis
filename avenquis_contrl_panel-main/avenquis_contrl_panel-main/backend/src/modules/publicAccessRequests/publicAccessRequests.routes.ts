import { Router } from 'express';
import { db } from '../../lib/database.js';
import { accessRequestRepo } from '../../lib/accessRequestRepository.js';

export const publicAccessRequestsRouter = Router();

publicAccessRequestsRouter.post(
  '/access-requests',
  async (req, res, next) => {
    try {
      const {
        firmName,
        requesterName,
        requesterEmail,
        requestType,
        requestedRole,
        jurisdiction,
        firmSize,
        requestNotes,
      } = req.body ?? {};

      if (
        !firmName ||
        !requesterName ||
        !requesterEmail
      ) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            'Firm name, requester name and email are required.',
        });
      }

      const email =
        String(requesterEmail)
          .trim()
          .toLowerCase();

      if (!email.includes('@')) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Valid email is required.',
        });
      }

      const request =
        await accessRequestRepo.createAccessRequest({
          firmName: String(firmName),
          requesterName: String(requesterName),
          requesterEmail: email,
          requestType:
            requestType
              ? String(requestType)
              : undefined,
          requestedRole:
            requestedRole
              ? String(requestedRole)
              : undefined,
          jurisdiction:
            jurisdiction
              ? String(jurisdiction)
              : undefined,
          firmSize:
            firmSize
              ? String(firmSize)
              : undefined,
          requestNotes:
            requestNotes
              ? String(requestNotes)
              : undefined,
        });

      res.status(201).json({
        request,
        data: request,
        message:
          'Access request submitted successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
);

publicAccessRequestsRouter.get(
  '/icab-members/:enrollmentNo',
  async (req, res, next) => {
    try {
      const enrollmentNo =
        String(req.params.enrollmentNo ?? '')
          .trim()
          .replace(/^0+/, '') || '0';

      const result = await db.query(
        `
        SELECT
          enrollment_no AS "enrollmentNo",
          member_name AS "memberName",
          membership_type AS "membershipType",
          designation,
          organization_firm AS "firmName",
          address_professional_details AS "address",
          mobile,
          email,
          source_pdf_page AS "sourcePdfPage"
        FROM cp_icab_members_master
        WHERE enrollment_no = $1
        LIMIT 1
        `,
        [enrollmentNo],
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'ICAB_MEMBER_NOT_FOUND',
          message:
            'No ICAB member found for this enrollment number.',
        });
      }

      return res.status(200).json({
        member: result.rows[0],
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },
);
