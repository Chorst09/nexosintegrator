const { isMaster, normalizeRole } = require('./permissions.cjs');

function isGlobalOperator(user = {}) {
  const role = normalizeRole(user.actualRole || user.role);
  return isMaster(user) || role === 'ADMIN';
}

function getUserRegionId(user = {}) {
  return user.regionId || null;
}

function buildCompanyScopeWhere(user = {}) {
  if (isGlobalOperator(user)) return {};

  const regionId = getUserRegionId(user);
  if (!regionId) return { id: '__no_access__' };

  return { regionId };
}

function buildContractScopeWhere(user = {}) {
  if (isGlobalOperator(user)) return {};

  const regionId = getUserRegionId(user);
  if (!regionId) return { id: '__no_access__' };

  return {
    company: {
      regionId
    }
  };
}

function canAccessCompanyRecord(user = {}, company = {}) {
  if (isGlobalOperator(user)) return true;

  const regionId = getUserRegionId(user);
  return Boolean(regionId && company?.regionId === regionId);
}

async function canAccessCompany(prisma, user, companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, regionId: true }
  });

  if (!company) return { allowed: false, missing: true };
  return { allowed: canAccessCompanyRecord(user, company), missing: false, company };
}

async function canAccessContract(prisma, user, contractId) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      companyId: true,
      company: {
        select: { id: true, regionId: true }
      }
    }
  });

  if (!contract) return { allowed: false, missing: true };
  return { allowed: canAccessCompanyRecord(user, contract.company), missing: false, contract };
}

async function canAccessCompanyDocument(prisma, user, documentId) {
  const document = await prisma.companyDocument.findUnique({
    where: { id: documentId },
    include: {
      company: {
        select: { id: true, regionId: true }
      }
    }
  });

  if (!document) return { allowed: false, missing: true };
  return { allowed: canAccessCompanyRecord(user, document.company), missing: false, document };
}

async function canAccessContractAttachment(prisma, user, attachmentId) {
  const attachment = await prisma.contractAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      contract: {
        select: {
          id: true,
          companyId: true,
          company: {
            select: { id: true, regionId: true }
          }
        }
      }
    }
  });

  if (!attachment) return { allowed: false, missing: true };
  return {
    allowed: canAccessCompanyRecord(user, attachment.contract?.company),
    missing: false,
    attachment
  };
}

module.exports = {
  isGlobalOperator,
  buildCompanyScopeWhere,
  buildContractScopeWhere,
  canAccessCompany,
  canAccessContract,
  canAccessCompanyDocument,
  canAccessContractAttachment
};
