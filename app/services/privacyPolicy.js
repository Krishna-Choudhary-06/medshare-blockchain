'use strict';

const rolePrivacyMap = {
    Patient: 'L0',
    Nurse: 'L1',
    Doctor: 'L2',
    'Lab Technician': 'L1',
    Admin: 'L3',
    Accountant: 'L3'
};

const roleAccessMap = {
    Doctor: ['L0', 'L1', 'L2', 'L3'],
    Nurse: ['L1', 'L2', 'L3'],
    'Lab Technician': ['L1', 'L3'],
    Admin: ['L2', 'L3'],
    Accountant: ['L3']
};

const categoryLevelMap = {
    prescription: 'L0',
    prescriptions: 'L0',
    laboratory: 'L1',
    'lab report': 'L1',
    lab: 'L1',
    medical_history: 'L2',
    'medical history': 'L2',
    history: 'L2',
    billing: 'L3',
    'billing information': 'L3',
    public: 'L3',
    insurance: 'L2',
    discharge_summary: 'L2',
    administrative: 'L3'
};

function levelRank(level) {
    const ranks = { L0: 0, L1: 1, L2: 2, L3: 3 };
    if (!(level in ranks)) {
        throw new Error(`Invalid privacy level: ${level}`);
    }
    return ranks[level];
}

function privacyRank(level) {
    return levelRank(level);
}

function roleAccessRank(role) {
    const normalized = String(role || '').trim();
    if (!(normalized in roleAccessMap)) {
        return Number.POSITIVE_INFINITY;
    }
    return roleAccessMap[normalized];
}

function roleCanAccessLevel(role, level) {
    const levels = roleAccessRank(role);
    if (!Array.isArray(levels)) return false;
    return levels.includes(level);
}

function deriveRequiredLevel(category, fallbackLevel = 'L0') {
    const key = String(category || '').toLowerCase().trim();
    return categoryLevelMap[key] || fallbackLevel || 'L0';
}

function roleDefaultPrivacyLevel(role) {
    const normalized = String(role || '').trim();
    return rolePrivacyMap[normalized] || rolePrivacyMap[normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()] || 'L2';
}

function canAccessRecord(userLevel, requiredLevel, { isOwner = false, isSubject = false, grantedUsers, revokedUsers, userId = '', userOrganization = '', recordOrganization = '' } = {}) {
    if (isOwner || isSubject) return true;
    const granted = Array.isArray(grantedUsers) ? grantedUsers : [];
    const revoked = Array.isArray(revokedUsers) ? revokedUsers : [];
    if (revoked.includes(userId)) return false;
    if (granted.includes(userId)) return true;
    const sameOrg = userOrganization && recordOrganization &&
        String(userOrganization).toLowerCase() === String(recordOrganization).toLowerCase();
    if (sameOrg) {
        return roleCanAccessLevel(userLevel, requiredLevel);
    }
    return false;
}

function isRecordOwner(record, userId) {
    const normalizedUser = String(userId || '').trim().toLowerCase();
    if (!normalizedUser) return false;

    const ownerCandidates = [
        record?.ownerId,
        record?.uploadedBy,
        record?.metadata?.ownerId,
        record?.metadata?.uploadedBy
    ];

    return ownerCandidates.some(
        (candidate) =>
            String(candidate || '').trim().toLowerCase() === normalizedUser
    );
}

function isRecordSubject(record, userId) {
    const normalizedUser = String(userId || '').trim().toLowerCase();
    if (!normalizedUser) return false;
    const subjectCandidates = [
        record?.patientId,
        record?.metadata?.patientId
    ];
    return subjectCandidates.some((candidate) => String(candidate || '').trim().toLowerCase() === normalizedUser);
}

function deriveEligibleUsers(users, requiredLevel) {
    return users.filter((user) => {
        if (!user?.userId || user.bgwRecipientId == null || user.bgwRecipientId === '') return false;
        return roleCanAccessLevel(user.role, requiredLevel);
    });
}

function buildRecipientSet(eligibleUsers) {
    const recipientIds = eligibleUsers
        .map((user) => Number(user.bgwRecipientId))
        .filter((id) => Number.isInteger(id) && id > 0);
    const authorizedUsers = eligibleUsers.map((user) => user.userId).filter(Boolean);
    return { recipientIds, authorizedUsers };
}

module.exports = {
    rolePrivacyMap,
    roleAccessMap,
    categoryLevelMap,
    levelRank,
    privacyRank,
    roleAccessRank,
    roleCanAccessLevel,
    deriveRequiredLevel,
    roleDefaultPrivacyLevel,
    canAccessRecord,
    isRecordOwner,
    isRecordSubject,
    deriveEligibleUsers,
    buildRecipientSet
};
