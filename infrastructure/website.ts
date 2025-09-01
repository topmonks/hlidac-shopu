import * as aws from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
import * as inputs from "@pulumi/aws/types/input";
import * as pulumi from "@pulumi/pulumi";

const websiteConfig = new pulumi.Config("topmonks_website");
const assetsPaths: string[] = JSON.parse(websiteConfig.get("assets_paths") ?? "[]");
const assetsCachingLambdaArn = websiteConfig.get("assets_caching_lambda_arn");
const securityHeadersLambdaArn = websiteConfig.get("security_headers_lambda_arn");

export const CloudFront = {
  /** @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html */
  ManagedCachePolicy: {
    CachingOptimized: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    CachingOptimizedForUncompressedObjects: "b2884449-e4de-46a7-ac36-70bc7f1ddd6d",
    CachingDisabled: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    ElementalMediaPackage: "08627262-05a9-4f76-9ded-b50ca2e3a84f",
    Amplify: "2e54312d-136d-493c-8eb9-b001f22f67d2"
  },
  /** @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html */
  ManagedOriginRequestPolicy: {
    UserAgentRefererHeaders: "acba4595-bd28-49b8-b9fe-13317c0390fa",
    CORSCustomOrigin: "59781a5b-3903-41f3-afcb-af62929ccde1",
    CORSS3Origin: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
    AllViewer: "216adef6-5c7f-47e4-b989-5492eafa07d3",
    ElementalMediaTailorPersonalizedManifests: "775133bc-15f2-49f9-abea-afb2e0bf67d2"
  },
  /** @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-response-headers-policies.html */
  ManagedResponseHeaderPolicy: {
    SimpleCORS: "60669652-455b-4ae9-85a4-c4c02393f86c",
    CORSWithPreflight: "5cc3b908-e619-4b99-88e5-2cf7f45965bd",
    SecurityHeadersPolicy: "67f7725c-6f97-4210-82d7-5512b31e9d03",
    CORSandSecurityHeadersPolicy: "e61eb60c-9c35-4d20-a928-2b84e02af89c",
    CORSwithPreflightAndSecurityHeadersPolicy: "eaab4381-ed33-4a86-88ca-d9558dc6cd63"
  }
};

export function createCacheBoostingPolicy(
  name: string,
  { customName, cookiesConfig, headersConfig, queryStringsConfig }: CacheBoostingPolicyArgs
) {
  return new aws.cloudfront.CachePolicy(name, {
    name: customName ?? "CacheBoosting",
    comment: "",
    defaultTtl: 31536000,
    maxTtl: 31536000,
    minTtl: 31536000,
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookiesConfig,
      headersConfig,
      queryStringsConfig
    }
  });
}

export function createSecurityHeadersAndPermissionsPolicy(
  name: string,
  { customName, corsConfig, etag, customHeaders = [] }: SecurityHeadersPolicyArgs
) {
  return new aws.cloudfront.ResponseHeadersPolicy(name, {
    name: customName ?? "SecurityHeaders-and-PermissionsPolicy",
    comment: "Security headers and Permission policy",
    corsConfig,
    customHeadersConfig: {
      items: [
        {
          header: "Permissions-Policy",
          value: "interest-cohort=()",
          override: false
        },
        ...customHeaders
      ]
    },
    etag,
    securityHeadersConfig: {
      contentTypeOptions: { override: true },
      frameOptions: { frameOption: "SAMEORIGIN", override: false },
      referrerPolicy: {
        referrerPolicy: "strict-origin-when-cross-origin",
        override: false
      },
      strictTransportSecurity: {
        preload: true,
        accessControlMaxAgeSec: 31536000,
        override: false
      },
      xssProtection: { protection: true, modeBlock: true, override: false }
    }
  });
}

/**
 * Creates S3 bucket with static website hosting enabled
 * @param parent {pulumi.ComponentResource} parent component
 * @param domain {string} website domain name
 * @param settings {aws.s3.BucketArgs}
 * @returns {aws.s3.Bucket}
 */
function createBucket(parent: pulumi.ComponentResource, domain: string, settings: aws.s3.BucketArgs) {
  const website = settings.website || {
    indexDocument: "index.html",
    errorDocument: "404.html"
  };
  const bucket = new aws.s3.Bucket(
    `${domain}/bucket`,
    {
      bucket: domain,
      corsRules: [
        {
          allowedHeaders: ["*"],
          allowedMethods: ["GET", "HEAD"],
          allowedOrigins: ["*"]
        }
      ],
      forceDestroy: true,
      ...settings,
      website
    },
    { parent }
  );
  new aws.s3.BucketPublicAccessBlock(`${domain}-bucket-pab`, {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false
  });

  return bucket;
}

/**
 * Creates Public read bucket policy
 * @param parent {pulumi.ComponentResource} parent component
 * @param domain {string} website domain name
 * @param bucket {aws.s3.Bucket}
 * @returns {aws.s3.BucketPolicy}
 */
function createBucketPolicy(parent: pulumi.ComponentResource, domain: string, bucket: aws.s3.Bucket) {
  return new aws.s3.BucketPolicy(
    `${domain}/bucket-policy`,
    {
      bucket: bucket.bucket,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: {
              AWS: "*"
            },
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${domain}/*`
          }
        ]
      })
    },
    { parent }
  );
}

/**
 * Creates CloudFront distribution on top of S3 website
 * @param parent {pulumi.ComponentResource} parent component
 * @param domain {string} website domain name
 * @param contentBucket {aws.s3.Bucket}
 * @param args {CloudFrontArgs}
 * @returns {aws.cloudfront.Distribution}
 */
function createCloudFront(
  parent: pulumi.ComponentResource,
  domain: string,
  contentBucket: aws.s3.Bucket,
  {
    isSPA,
    assetsPaths,
    assetsCachePolicyId,
    assetResponseHeadersPolicyId,
    assetsCachingLambdaArn,
    securityHeadersLambdaArn,
    edgeLambdas,
    cachePolicyId,
    originRequestPolicyId,
    responseHeadersPolicyId,
    extraOrigins,
    extraCacheBehaviors,
    provider,
    webAcl
  }: CloudFrontArgs
) {
  const acmCertificate = getCertificate(domain, provider);
  const customErrorResponses: pulumi.Input<inputs.cloudfront.DistributionCustomErrorResponse>[] = [];
  if (isSPA) {
    // return SPA page for every request
    customErrorResponses.push({
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html"
    });
  }

  const assetsCacheBoost = (pathPattern: string): aws.types.input.cloudfront.DistributionOrderedCacheBehavior => ({
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    compress: true,
    cachePolicyId: assetsCachePolicyId,
    responseHeadersPolicyId: assetResponseHeadersPolicyId,
    defaultTtl: assetsCachePolicyId ? undefined : 31536000,
    forwardedValues: assetsCachePolicyId
      ? undefined
      : {
          cookies: {
            forward: "none"
          },
          headers: ["Origin"],
          queryString: false
        },
    maxTtl: assetsCachePolicyId ? undefined : 31536000,
    minTtl: assetsCachePolicyId ? undefined : 31536000,
    pathPattern,
    targetOriginId: contentBucket.arn,
    viewerProtocolPolicy: "redirect-to-https",
    lambdaFunctionAssociations: assetsCachingLambdaArn
      ? [
          // add lambda edge with cache headers for immutable assets
          {
            eventType: "viewer-response",
            lambdaArn: assetsCachingLambdaArn
          }
        ]
      : undefined
  });
  const lambdaAssociation = ({ pathPattern, lambdaAssociation }) =>
    createLambdaAssociation(pathPattern, lambdaAssociation, contentBucket, securityHeadersLambdaArn);
  const assetsCacheBehaviors = assetsPaths?.map(assetsCacheBoost);
  const lambdaAssociationBehavior = edgeLambdas?.map(lambdaAssociation);
  let orderedCacheBehaviors =
    assetsCacheBehaviors && lambdaAssociationBehavior
      ? assetsCacheBehaviors.concat(lambdaAssociationBehavior)
      : (assetsCacheBehaviors ?? lambdaAssociationBehavior);
  if (orderedCacheBehaviors && extraCacheBehaviors) {
    orderedCacheBehaviors.push(...extraCacheBehaviors);
  } else if (extraCacheBehaviors) {
    orderedCacheBehaviors = extraCacheBehaviors;
  }

  const origins: aws.types.input.cloudfront.DistributionOrigin[] = [
    {
      originId: contentBucket.arn,
      domainName: contentBucket.websiteEndpoint,
      customOriginConfig: {
        // Amazon S3 doesn't support HTTPS connections when using an S3 bucket configured as a website endpoint.
        // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginProtocolPolicy
        originProtocolPolicy: "http-only",
        httpPort: 80,
        httpsPort: 443,
        originSslProtocols: ["TLSv1.2"]
      }
    }
  ];
  if (extraOrigins) origins.push(...extraOrigins);
  return new aws.cloudfront.Distribution(
    `${domain}/cdn-distribution`,
    {
      enabled: true,
      aliases: [domain],
      origins,
      customErrorResponses,
      defaultRootObject: "index.html",
      defaultCacheBehavior: {
        targetOriginId: contentBucket.arn,
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        cachePolicyId,
        originRequestPolicyId,
        responseHeadersPolicyId,
        forwardedValues: cachePolicyId
          ? undefined
          : {
              cookies: { forward: "none" },
              headers: ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"],
              queryString: true
            },
        minTtl: cachePolicyId ? undefined : 0,
        defaultTtl: cachePolicyId ? undefined : 86400,
        maxTtl: cachePolicyId ? undefined : 31536000,
        // enable gzip and brotli
        compress: true,
        lambdaFunctionAssociations: securityHeadersLambdaArn
          ? [
              // add lambda edge with security headers for A+ SSL Grade
              {
                eventType: "viewer-response",
                lambdaArn: securityHeadersLambdaArn
              }
            ]
          : undefined
      },
      orderedCacheBehaviors,
      priceClass: "PriceClass_100",
      restrictions: {
        geoRestriction: {
          restrictionType: "none"
        }
      },
      viewerCertificate: {
        acmCertificateArn: acmCertificate.apply(x => x.arn),
        sslSupportMethod: "sni-only",
        minimumProtocolVersion: "TLSv1.2_2021"
      },
      isIpv6Enabled: true,
      webAclId: webAcl?.id
    },
    {
      parent,
      dependsOn: [contentBucket, webAcl]
    }
  );
}

function createLambdaAssociation(
  pathPattern: string,
  lambdaAssociation: {
    lambdaArn: string | pulumi.Output<string>;
    eventType: string;
  },
  contentBucket: Bucket,
  securityHeadersLambdaArn: string | pulumi.Output<string>
): aws.types.input.cloudfront.DistributionOrderedCacheBehavior {
  const cacheBehavior = {
    pathPattern: pathPattern,
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    minTtl: 0,
    defaultTtl: 86400,
    maxTtl: 31536000,
    // enable gzip
    compress: true,
    targetOriginId: contentBucket.arn,
    viewerProtocolPolicy: "redirect-to-https",
    forwardedValues: {
      cookies: { forward: "none" },
      headers: ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"],
      queryString: true
    },
    lambdaFunctionAssociations: [lambdaAssociation]
  };
  if (securityHeadersLambdaArn) {
    cacheBehavior.lambdaFunctionAssociations.push({
      eventType: "viewer-response",
      lambdaArn: securityHeadersLambdaArn
    });
  }
  return cacheBehavior;
}

/**
 * Creates a new Route53 DNS record pointing the domain or the CloudFront distribution.
 * For CloudFront distribution ALIAS record is created. Otherwise, CNAME.
 * This allows to have naked domain websites.
 * @param parent {Website} parent component
 * @param domain {string} website domain name
 * @param cname {pulumi.Output<string>} aliased domain name
 * @param provider {aws.Provider}
 * @returns {aws.route53.Record[]}
 */
function createAliasRecords(
  parent: Website,
  domain: string,
  cname: pulumi.Output<string>,
  provider?: aws.Provider
): aws.route53.Record[] {
  const hostedZone = getHostedZone(domain, provider);
  const cdn = parent.cdn;
  if (!cdn) {
    const args: aws.route53.RecordArgs = {
      name: domain,
      zoneId: hostedZone.apply(x => x.zoneId),
      ttl: 300,
      type: "CNAME",
      records: [cname]
    };
    return [new aws.route53.Record(`${domain}/dns-record`, args, { parent, provider })];
  }

  const args = (type: string) => ({
    name: domain,
    zoneId: hostedZone.apply(x => x.zoneId),
    type,
    aliases: [
      {
        evaluateTargetHealth: true,
        name: cdn.domainName,
        zoneId: cdn.hostedZoneId
      }
    ]
  });
  return [
    new aws.route53.Record(`${domain}/dns-record`, args("A"), {
      parent,
      provider
    }),
    new aws.route53.Record(`${domain}/dns-record-ipv6`, args("AAAA"), {
      parent,
      provider
    })
  ];
}
/**
 * Creates CNAME record in Route 53
 * @param name {string}
 * @param domain {string}
 * @param value {string}
 * @param provider {aws.Provider}
 */
export function createCNAMERecord(name: string, domain: string, value: string, provider?: aws.Provider) {
  const hostedZone = getHostedZone(domain, provider);
  return new aws.route53.Record(
    `${domain}/txt-record-${name}`,
    {
      name: hostedZone.apply(x => x.name),
      type: "CNAME",
      zoneId: hostedZone.apply(x => x.zoneId),
      records: [value],
      ttl: 3600
    },
    { provider }
  );
}

/**
 * Creates TXT record in Route 53
 * @param name {string}
 * @param domain {string}
 * @param value {string}
 * @param provider {aws.Provider}
 */
export function createTxtRecord(name: string, domain: string, value: string, provider?: aws.Provider) {
  const hostedZone = getHostedZone(domain, provider);
  return new aws.route53.Record(
    `${domain}/txt-record-${name}`,
    {
      name: hostedZone.apply(x => x.name),
      type: "TXT",
      zoneId: hostedZone.apply(x => x.zoneId),
      records: [value],
      ttl: 3600
    },
    { provider }
  );
}

/**
 * Creates MX record in Route 53 for Google Workspace purpose
 * @param domain {string}
 * @param provider {aws.Provider}
 */
export function createGoogleMxRecords(domain: string, provider?: aws.Provider) {
  const hostedZone = getHostedZone(domain, provider);
  return new aws.route53.Record(
    `${domain}/google-mx-records`,
    {
      name: hostedZone.apply(x => x.name),
      type: "MX",
      zoneId: hostedZone.apply(x => x.zoneId),
      records: [
        "1 ASPMX.L.GOOGLE.COM.",
        "5 ALT1.ASPMX.L.GOOGLE.COM.",
        "5 ALT2.ASPMX.L.GOOGLE.COM.",
        "10 ALT3.ASPMX.L.GOOGLE.COM.",
        "10 ALT4.ASPMX.L.GOOGLE.COM."
      ],
      ttl: 3600
    },
    { provider }
  );
}

export function getHostedZone(domain: string, provider?: aws.Provider) {
  const hostedZone = aws.route53.getZone(
    {
      name: getRootDomain(domain)
    },
    { provider }
  );
  return pulumi.output(hostedZone);
}

/**
 * Creates Wildcard certificate for the top domain.
 * This creates a certificate for the root domain with wildcard for all subdomains.
 * You will need to have just one instance per all your stacks.
 * @param domain {string} website domain name
 * @param provider {aws.Provider}
 * @param options {{caaRecords: string[]}}
 * @returns {pulumi.Output<string>}
 */
export function createCertificate(
  domain: string,
  provider?: aws.Provider,
  { caaRecords } = { caaRecords: [] }
): pulumi.Output<string> {
  const parentDomain = getParentDomain(domain);
  const usEast1 =
    provider ??
    new aws.Provider(`${domain}/provider/us-east-1`, {
      profile: aws.config.profile,
      region: aws.USEast1Region
    });

  const certificate = new aws.acm.Certificate(
    `${parentDomain}-certificate`,
    {
      domainName: `*.${parentDomain}`,
      subjectAlternativeNames: [parentDomain],
      validationMethod: "DNS"
    },
    { provider: usEast1 }
  );
  const hostedZoneId = aws.route53.getZone({ name: getRootDomain(domain) }, { async: true }).then(zone => zone.zoneId);

  /**
   * Create a Certification Authority Authorization (CAA) DNS record to specify that AWS Certificate Manager (ACM)
   * is allowed to issue a certificate for your domain or subdomain.
   * See https://docs.aws.amazon.com/acm/latest/userguide/setup-caa.html for more info.
   */
  const caaRecord = new aws.route53.Record(`${parentDomain}-caaRecord`, {
    name: parentDomain,
    zoneId: hostedZoneId,
    type: "CAA",
    records: [
      `0 issue "letsencrypt.org"`,
      `0 issue "pki.goog"`,
      `0 issue "amazon.com"`,
      `0 issue "amazontrust.com"`,
      `0 issue "awstrust.com"`,
      `0 issue "amazonaws.com"`,
      `0 issuewild "amazon.com"`,
      `0 issuewild "amazontrust.com"`,
      `0 issuewild "awstrust.com"`,
      `0 issuewild "amazonaws.com"`,
      `0 iodef "mailto:admin@topmonks.com"`,
      ...caaRecords
    ],
    ttl: 3600
  });

  /**
   *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
   *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
   */
  const certificateValidationDomain = new aws.route53.Record(`${parentDomain}-validationRecord`, {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: 600
  });

  const certificateValidation = new aws.acm.CertificateValidation(
    `${parentDomain}-certificateValidation`,
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [certificateValidationDomain.fqdn]
    },
    { provider: usEast1 }
  );
  return certificateValidation.certificateArn;
}

/**
 * Gets Wildcard certificate for top domain
 * @param domain {string} website domain name
 * @param provider {aws.Provider}
 * @returns {pulumi.Output<pulumi.Unwrap<aws.acm.GetCertificateResult>>}
 */
export function getCertificate(domain: string, provider?: aws.Provider) {
  const parentDomain = getParentDomain(domain);
  const usEast1 =
    provider ??
    new aws.Provider(`${domain}/get-provider/us-east-1`, {
      profile: aws.config.profile,
      region: aws.USEast1Region
    });
  const certificate = aws.acm.getCertificate(
    { domain: `*.${parentDomain}`, mostRecent: true, statuses: ["ISSUED"] },
    { provider: usEast1, async: true }
  );
  return pulumi.output(certificate);
}

function getParentDomain(domain: string) {
  const { parentDomain } = getDomainAndSubdomain(domain);
  return parentDomain.slice(0, -1);
}

function getRootDomain(domain: string) {
  const { rootDomain } = getDomainAndSubdomain(domain);
  return rootDomain.slice(0, -1);
}

/**
 * Split a domain name into its subdomain and parent domain names.
 * e.g. "www.example.com" => "www", "example.com".
 * @param domain
 * @returns {*}
 */
function getDomainAndSubdomain(domain: string) {
  const parts = domain.split(".");
  if (parts.length < 2) {
    throw new Error(`No TLD found on ${domain}`);
  }
  if (parts.length === 2) {
    return {
      subdomain: "",
      parentDomain: `${domain}.`,
      rootDomain: `${domain}.`
    };
  }

  const subdomain = parts.slice(0, parts.length - 2);
  const parent = parts.slice(1);
  const root = parts.slice(parts.length - 2);
  return {
    subdomain: subdomain.join("."),
    parentDomain: `${parent.join(".")}.`,
    rootDomain: `${root.join(".")}.`
  };
}

/**
 * WebSite component resource represents logical unit of static website
 * hosted in AWS S3 and distributed via CloudFront CDN with Route53 DNS Record.
 */
export class Website extends pulumi.ComponentResource {
  contentBucket: aws.s3.Bucket;
  contentBucketPolicy: aws.s3.BucketPolicy;
  cdn?: aws.cloudfront.Distribution;
  dnsRecords: aws.route53.Record[];
  public domain: pulumi.Output<string>;
  public url: pulumi.Output<string>;

  get s3BucketUri(): pulumi.Output<string> {
    return this.contentBucket.bucket.apply(x => `s3://${x}`);
  }

  get s3WebsiteUrl(): pulumi.Output<string> {
    return this.contentBucket.websiteEndpoint.apply(x => `http://${x}`);
  }

  get cloudFrontId(): pulumi.Output<string> | undefined {
    return this.cdn?.id;
  }

  /**
   *
   * @param domain {string} domain name of the website
   * @param settings {*} optional overrides of website configuration
   * @param opts {pulumi.ComponentResourceOptions}
   */
  constructor(domain: string, settings: WebsiteSettings, opts?: pulumi.ComponentResourceOptions) {
    super("topmonks-webs:WebSite", domain, settings, opts);
    this.domain = pulumi.output(domain);
    this.url = pulumi.output(`https://${domain}/`);
  }

  /**
   * Asynchronously creates new WebSite Resource
   * @param domain {string} website domain name
   * @param settings {*} optional overrides of website configuration
   * @param opts {pulumi.ComponentResourceOptions}
   * @returns {Website}
   */
  static create(domain: string, settings: WebsiteSettings, opts?: pulumi.ComponentResourceOptions) {
    try {
      settings = {
        assetsPaths,
        assetsCachingLambdaArn,
        securityHeadersLambdaArn,
        ...settings
      };
      const website = new Website(domain, settings, opts);
      const contentBucket = createBucket(website, domain, settings.bucket || {});
      website.contentBucket = contentBucket;
      website.contentBucketPolicy = createBucketPolicy(website, domain, contentBucket);
      if (!settings.cdn?.disabled) {
        website.cdn = createCloudFront(website, domain, contentBucket, {
          isSPA: settings.isSPA ?? settings.isPwa,
          assetsPaths: settings.assetsPaths,
          assetsCachePolicyId: settings.assetsCachePolicyId,
          assetResponseHeadersPolicyId: settings.assetResponseHeadersPolicyId,
          assetsCachingLambdaArn: settings.assetsCachingLambdaArn,
          securityHeadersLambdaArn: settings.securityHeadersLambdaArn,
          edgeLambdas: settings.edgeLambdas,
          cachePolicyId: settings.cachePolicyId,
          originRequestPolicyId: settings.originRequestPolicyId,
          responseHeadersPolicyId: settings.responseHeadersPolicyId,
          extraOrigins: settings.extraOrigins,
          extraCacheBehaviors: settings.extraCacheBehaviors,
          provider: settings.certificateProvider,
          webAcl: settings.webAcl
        });
      }
      if (!settings.dns?.disabled) {
        website.dnsRecords = createAliasRecords(website, domain, contentBucket.bucketDomainName);
      }

      const outputs: pulumi.Inputs = {
        contentBucketUri: website.s3BucketUri,
        s3WebsiteUrl: website.s3WebsiteUrl,
        url: website.url,
        domain: website.domain,
        cloudFrontId: website.cloudFrontId
      };
      website.registerOutputs(outputs);
      return website;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static createRedirect(
    domain: string,
    settings: RedirectWebsiteSettings,
    opts?: pulumi.ComponentResourceOptions
  ): Website | null {
    try {
      const bucketSettings = {
        website: {
          redirectAllRequestsTo: settings.target
        }
      };
      const website = new Website(
        domain,
        {
          bucket: bucketSettings,
          certificateProvider: settings.certificateProvider
        },
        opts
      );
      const bucket = (website.contentBucket = createBucket(website, domain, bucketSettings));
      website.contentBucketPolicy = createBucketPolicy(website, domain, bucket);
      website.cdn = createCloudFront(website, domain, bucket, {
        isSPA: false,
        cachePolicyId: settings.cachePolicyId,
        originRequestPolicyId: settings.originRequestPolicyId,
        responseHeadersPolicyId: settings.responseHeadersPolicyId,
        provider: settings.certificateProvider
      });
      website.dnsRecords = createAliasRecords(website, domain, bucket.bucketDomainName);
      return website;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}

export interface CloudFrontArgs {
  isSPA: boolean | undefined;
  assetsPaths?: string[];
  assetsCachePolicyId?: Promise<string> | pulumi.Output<string> | string;
  assetResponseHeadersPolicyId?: Promise<string> | pulumi.Output<string> | string;
  assetsCachingLambdaArn?: string | pulumi.Output<string>;
  securityHeadersLambdaArn?: string | pulumi.Output<string>;
  edgeLambdas?: EdgeLambdaAssociation[];
  cachePolicyId?: Promise<string> | pulumi.Output<string> | string;
  originRequestPolicyId?: Promise<string> | pulumi.Output<string> | string;
  responseHeadersPolicyId?: Promise<string> | pulumi.Output<string> | string;
  extraOrigins?: inputs.cloudfront.DistributionOrigin[];
  extraCacheBehaviors?: inputs.cloudfront.DistributionOrderedCacheBehavior[];
  provider?: aws.Provider;
  webAcl?: aws.waf.WebAcl;
}

export interface WebsiteSettings {
  /** @deprecated Use `isSPA` instead */
  isPwa?: boolean;
  isSPA?: boolean;
  bucket?: aws.s3.BucketArgs;
  cdn?: DisableSetting;
  dns?: DisableSetting;
  "lh-token"?: string;
  assetsPaths?: string[];
  assetsCachePolicyId?: Promise<string> | pulumi.Output<string> | string;
  assetResponseHeadersPolicyId?: Promise<string> | pulumi.Output<string> | string;
  assetsCachingLambdaArn?: string | pulumi.Output<string>;
  securityHeadersLambdaArn?: string | pulumi.Output<string>;
  edgeLambdas?: EdgeLambdaAssociation[];
  cachePolicyId?: string | pulumi.Output<string> | Promise<string>;
  originRequestPolicyId?: Promise<string> | pulumi.Output<string> | string;
  responseHeadersPolicyId?: Promise<string> | pulumi.Output<string> | string;
  extraOrigins?: inputs.cloudfront.DistributionOrigin[];
  extraCacheBehaviors?: inputs.cloudfront.DistributionOrderedCacheBehavior[];
  certificateProvider?: aws.Provider;
  webAcl?: aws.waf.WebAcl;
}

export interface EdgeLambdaAssociation {
  pathPattern: string;
  lambdaAssociation: {
    lambdaArn: string | pulumi.Output<string>;
    eventType: string;
  };
}

export interface RedirectWebsiteSettings {
  target: string;
  cachePolicyId?: string | pulumi.Output<string> | Promise<string>;
  originRequestPolicyId?: Promise<string> | pulumi.Output<string> | string;
  responseHeadersPolicyId?: Promise<string> | pulumi.Output<string> | string;
  certificateProvider?: aws.Provider;
}

export interface DisableSetting {
  disabled: boolean;
}

export interface CacheBoostingPolicyArgs {
  customName?: string;
  cookiesConfig: inputs.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginCookiesConfig;
  headersConfig: inputs.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginHeadersConfig;
  queryStringsConfig: inputs.cloudfront.CachePolicyParametersInCacheKeyAndForwardedToOriginQueryStringsConfig;
}

export interface SecurityHeadersPolicyArgs {
  customName?: string;
  corsConfig?: inputs.cloudfront.ResponseHeadersPolicyCorsConfig;
  etag?: string;
  customHeaders?: inputs.cloudfront.ResponseHeadersPolicyCustomHeadersConfigItem[];
}
