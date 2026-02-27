import * as forge from 'node-forge';
import crypto from 'crypto';
import { SignedXml } from 'xml-crypto';

/**
 * Módulo Avanzado de Firma Digital XAdES-EPES para Hacienda CR.
 * Utiliza xml-crypto para la Inyección Canonizada del Hash RSA-SHA256.
 */
export class HaciendaSigner {

    /**
     * Extrae la Llave Privada (PEM) y Certificado (Base64) de un buffer .p12
     */
    private static extractKeysFromP12(p12Buffer: Buffer, p12Password: string) {
        try {
            const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString('binary')));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Password);

            let privateKeyForge: forge.pki.PrivateKey | null = null;
            let certForge: forge.pki.Certificate | null = null;

            for (const safeContent of p12.safeContents) {
                for (const safeBag of safeContent.safeBags) {
                    if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                        privateKeyForge = safeBag.key as forge.pki.PrivateKey;
                    } else if (safeBag.type === forge.pki.oids.certBag) {
                        certForge = safeBag.cert as forge.pki.Certificate;
                    }
                }
            }

            if (!privateKeyForge || !certForge) {
                throw new Error("No se pudo extraer la llave privada o el certificado del archivo .p12.");
            }

            const privateKeyPem = forge.pki.privateKeyToPem(privateKeyForge);
            const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certForge)).getBytes();
            const certBase64 = forge.util.encode64(certDer);

            return { privateKeyPem, certBase64 };

        } catch (e: any) {
            throw new Error(`Fallo al desencriptar el p12: ${e.message}`);
        }
    }

    /**
     * Firma criptográficamente un XML con el formato estricto XAdES-EPES
     * Utilizando xml-crypto para cumplir con la firma y canonización W3C de Hacienda 4.3.
     */
    static async firmarXML(
        xmlSinFimar: string,
        p12Data: Uint8Array | Buffer,
        p12Password: string
    ): Promise<string> {
        const p12Buffer = Buffer.isBuffer(p12Data) ? p12Data : Buffer.from(p12Data);

        // 1. Extraer LLaves
        const { privateKeyPem, certBase64 } = this.extractKeysFromP12(p12Buffer, p12Password);

        // Formatear PEM del cert para el inyector de xml-crypto
        const certChunks = certBase64.match(/.{1,64}/g)?.join('\n') || certBase64;
        const certPemFormateado = `-----BEGIN CERTIFICATE-----\n${certChunks}\n-----END CERTIFICATE-----`;

        // 2. Definir Inyector Principal
        const sig = new SignedXml({
            idMode: 'wssecurity' // Hacienda requiere compatibilidad XML puro
        });

        sig.privateKey = privateKeyPem;
        sig.publicCert = certPemFormateado;
        sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

        // 3. Agregar referencia al XML Raíz conTransforms C14N
        sig.addReference({
            xpath: "//*[local-name(.)='FacturaElectronica' or local-name(.)='NotaCreditoElectronica' or local-name(.)='NotaDebitoElectronica' or local-name(.)='TiqueteElectronico' or local-name(.)='MensajeReceptor']",
            transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
            digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256"
        });

        // Validar namespace raíz
        const namespaceXMLMatch = xmlSinFimar.match(/xmlns="([^"]*)"/);
        if (!namespaceXMLMatch) {
            throw new Error("El XML Base no tiene Namespace oficial de Hacienda CR definido.");
        }

        // 4. Agregar Propiedades XAdES obligatorias
        const policyUrl = "https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.1/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf";
        const policyHash = "Vnn0OwgH+Fk5Y7VfByl3xH0pBVk="; // Hash quemado por resolución Hacienda
        const tiempoFirma = new Date().toISOString();

        const xadesObject = `
    <Object xmlns="http://www.w3.org/2000/09/xmldsig#">
        <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#SignatureId">
            <xades:SignedProperties Id="SignedPropertiesId">
                <xades:SignedSignatureProperties>
                    <xades:SigningTime>${tiempoFirma}</xades:SigningTime>
                    <xades:SignaturePolicyIdentifier>
                        <xades:SignaturePolicyId>
                            <xades:SigPolicyId>
                                <Identifier xmlns="http://www.w3.org/2000/09/xmldsig#">${policyUrl}</Identifier>
                            </xades:SigPolicyId>
                            <xades:SigPolicyHash>
                                <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" xmlns="http://www.w3.org/2000/09/xmldsig#"/>
                                <DigestValue xmlns="http://www.w3.org/2000/09/xmldsig#">${policyHash}</DigestValue>
                            </xades:SigPolicyHash>
                        </xades:SignaturePolicyId>
                    </xades:SignaturePolicyIdentifier>
                </xades:SignedSignatureProperties>
            </xades:SignedProperties>
        </xades:QualifyingProperties>
    </Object>`.trim();

        // 5. Inyectar referencia en X-Crypto hacia SignedProperties de XAdES
        sig.addReference({
            xpath: "//*[@Id='SignedPropertiesId']",
            transforms: ["http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
            digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256"
        });

        sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

        // 6. Configurar Inyección
        // location action 'append' agrega todo al final antes del cierre
        sig.computeSignature(xmlSinFimar, {
            prefix: 'ds',
            location: { action: 'append' }
        });

        let xmlFirmadoIntermedio = sig.getSignatureXml();
        const xmlValidDoc = sig.getOriginalXmlWithIds();

        // Injectamos manualmente el Object dentro de la etiqueta Signature final (Antes de cerrar ds:Signature)
        const signatureCierre = '</ds:Signature>';
        let xmlFinal = xmlValidDoc;

        // Unir la firma generada con el objeto XAdES manualmente para que coincida con requerimiento Hacienda
        if (xmlFirmadoIntermedio.includes(signatureCierre)) {
            const firmaExtendidaXades = xmlFirmadoIntermedio.replace(signatureCierre, `${xadesObject}\n${signatureCierre}`);

            // Remplazar antes del Root End Tag Custom
            const rootMatch = xmlValidDoc.match(/<\/[A-Za-z]+>$/);
            if (rootMatch) {
                xmlFinal = xmlValidDoc.replace(rootMatch[0], `${firmaExtendidaXades}${rootMatch[0]}`);
            }
        }

        // 7. Retornar en Base64 para el Payload del Request HTTP
        return Buffer.from(xmlFinal).toString('base64');
    }
}
