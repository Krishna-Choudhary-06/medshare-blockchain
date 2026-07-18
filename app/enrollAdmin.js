'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

async function main() {
    const ccpPath = path.resolve(
        process.env.HOME, 'fabric-samples', 'test-network',
        'organizations', 'peerOrganizations', 'org1.example.com',
        'connection-org1.json'
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const ca = new FabricCAServices(caInfo.url, {
        trustedRoots: caInfo.tlsCACerts.pem,
        verify: false
    }, caInfo.caName);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Enroll admin
    const adminExists = await wallet.get('admin');
    if (!adminExists) {
        const enrollment = await ca.enroll({
            enrollmentID: 'admin', enrollmentSecret: 'adminpw'
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            },
            mspId: 'Org1MSP',
            type: 'X.509'
        };
        await wallet.put('admin', x509Identity);
        console.log('✅ Admin enrolled');
    }

    // Register and enroll appUser
    const userExists = await wallet.get('appUser3');
    if (!userExists) {
        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry()
            .getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');
        const secret = await ca.register({
    affiliation: 'org1.department1',
    enrollmentID: 'appUser3',
    role: 'client'
}, adminUser);
        const enrollment = await ca.enroll({
    enrollmentID: 'appUser3',
    enrollmentSecret: secret
});
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()

            },
            mspId: 'Org1MSP',
            type: 'X.509'
        };
        await wallet.put('appUser3', x509Identity);
console.log('✅ appUser3 enrolled');
    }
}

main().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
