#!/usr/bin/env python3
"""Auto-tag questions.json with AWS topic tags based on keyword matching."""

import json
import re
from pathlib import Path

TOPIC_KEYWORDS: dict[str, list[str]] = {
    "S3": [
        r"\bS3\b", r"Amazon S3\b", r"S3 bucket", r"S3 Transfer Acceleration",
        r"S3 Glacier", r"S3 Intelligent-Tiering", r"S3 Standard", r"S3 Cross-Region",
        r"S3 Lifecycle", r"S3 Replication", r"presigned URL", r"multipart upload",
        r"object storage", r"S3 Object Lock", r"S3 Versioning", r"S3 Event",
    ],
    "EC2": [
        r"\bEC2\b", r"Amazon EC2", r"EC2 instance", r"instance type", r"AMI\b",
        r"Auto Scaling group", r"launch template", r"spot instance", r"reserved instance",
        r"on-demand instance", r"dedicated host", r"EC2 Auto Scaling", r"user data",
        r"EC2 Image Builder", r"instance store",
    ],
    "VPC": [
        r"\bVPC\b", r"subnet", r"security group", r"network ACL", r"NACL",
        r"internet gateway", r"NAT gateway", r"VPC peering", r"Transit Gateway",
        r"VPC endpoint", r"PrivateLink", r"flow log", r"route table",
        r"CIDR", r"private subnet", r"public subnet", r"Elastic IP",
    ],
    "IAM": [
        r"\bIAM\b", r"IAM role", r"IAM policy", r"IAM user", r"IAM group",
        r"permission", r"trust policy", r"resource-based policy", r"service control policy",
        r"\bSCP\b", r"identity federation", r"SAML", r"OIDC", r"assume role",
        r"cross-account", r"least privilege",
    ],
    "RDS": [
        r"\bRDS\b", r"Amazon RDS", r"Aurora", r"Multi-AZ", r"read replica",
        r"database instance", r"MySQL", r"PostgreSQL", r"MariaDB", r"Oracle",
        r"SQL Server", r"RDS Proxy", r"Aurora Serverless", r"Aurora Global",
        r"automated backup", r"snapshot", r"parameter group",
    ],
    "DynamoDB": [
        r"DynamoDB", r"NoSQL", r"partition key", r"sort key", r"DynamoDB Stream",
        r"DynamoDB Accelerator", r"\bDAX\b", r"global table", r"on-demand capacity",
        r"provisioned capacity", r"GSI\b", r"LSI\b",
    ],
    "Lambda": [
        r"\bLambda\b", r"AWS Lambda", r"serverless function", r"function URL",
        r"Lambda layer", r"Lambda@Edge", r"event source mapping",
    ],
    "API Gateway": [
        r"API Gateway", r"REST API", r"HTTP API", r"WebSocket API", r"API endpoint",
        r"API throttling", r"usage plan", r"API key",
    ],
    "CloudFront": [
        r"CloudFront", r"CDN\b", r"content delivery", r"edge location",
        r"origin", r"distribution", r"cache behavior", r"CloudFront Function",
        r"signed URL", r"OAC\b", r"OAI\b",
    ],
    "Route 53": [
        r"Route 53", r"DNS\b", r"hosted zone", r"record set", r"health check",
        r"routing policy", r"latency routing", r"geolocation routing", r"failover routing",
        r"weighted routing", r"alias record",
    ],
    "ELB": [
        r"\bELB\b", r"Elastic Load Balancing", r"Application Load Balancer", r"\bALB\b",
        r"Network Load Balancer", r"\bNLB\b", r"Gateway Load Balancer", r"\bGLWB\b",
        r"Classic Load Balancer", r"target group", r"listener rule", r"stickiness",
    ],
    "ECS / EKS": [
        r"\bECS\b", r"Elastic Container Service", r"\bEKS\b", r"Elastic Kubernetes",
        r"Fargate", r"container", r"Docker", r"task definition", r"service",
        r"cluster", r"Kubernetes", r"ECR\b", r"Elastic Container Registry",
    ],
    "SQS": [
        r"\bSQS\b", r"Simple Queue Service", r"message queue", r"dead-letter queue",
        r"\bDLQ\b", r"visibility timeout", r"FIFO queue", r"long polling",
    ],
    "SNS": [
        r"\bSNS\b", r"Simple Notification Service", r"topic", r"subscription",
        r"pub/sub", r"fanout", r"mobile push",
    ],
    "Kinesis": [
        r"Kinesis", r"data stream", r"Kinesis Firehose", r"Kinesis Data Analytics",
        r"shard", r"stream processing", r"real-time",
    ],
    "CloudWatch": [
        r"CloudWatch", r"metric", r"alarm", r"log group", r"log stream",
        r"CloudWatch Agent", r"CloudWatch Events", r"EventBridge", r"metric filter",
        r"dashboard", r"anomaly detection",
    ],
    "CloudFormation": [
        r"CloudFormation", r"stack", r"template", r"IaC", r"infrastructure as code",
        r"nested stack", r"StackSet", r"change set", r"drift detection",
    ],
    "ElastiCache": [
        r"ElastiCache", r"Redis", r"Memcached", r"in-memory cache", r"cache cluster",
        r"session store",
    ],
    "Redshift": [
        r"Redshift", r"data warehouse", r"columnar storage", r"AQUA\b",
        r"Redshift Spectrum", r"Redshift Serverless",
    ],
    "Athena": [
        r"Athena", r"query S3", r"serverless query", r"SQL on S3",
    ],
    "Glue": [
        r"\bGlue\b", r"AWS Glue", r"ETL job", r"Glue Catalog", r"data catalog",
        r"crawler",
    ],
    "EMR": [
        r"\bEMR\b", r"Elastic MapReduce", r"Hadoop", r"Spark", r"Hive", r"big data",
    ],
    "Step Functions": [
        r"Step Functions", r"state machine", r"workflow orchestration",
    ],
    "KMS": [
        r"\bKMS\b", r"Key Management Service", r"encryption key", r"CMK\b",
        r"customer managed key", r"data key", r"envelope encryption",
    ],
    "Secrets Manager": [
        r"Secrets Manager", r"secret rotation", r"database credential",
    ],
    "WAF / Shield": [
        r"\bWAF\b", r"AWS Shield", r"DDoS", r"web ACL", r"rate-based rule",
        r"SQL injection", r"XSS",
    ],
    "Direct Connect": [
        r"Direct Connect", r"dedicated connection", r"hosted connection",
        r"virtual interface", r"\bVIF\b",
    ],
    "VPN": [
        r"Site-to-Site VPN", r"Client VPN", r"VPN connection", r"IPsec",
        r"virtual private gateway", r"\bVGW\b", r"customer gateway",
    ],
    "Storage Gateway": [
        r"Storage Gateway", r"file gateway", r"volume gateway", r"tape gateway",
    ],
    "DataSync": [
        r"DataSync", r"data transfer", r"on-premises to AWS",
    ],
    "Snow Family": [
        r"Snowball", r"Snowcone", r"Snowmobile", r"Snow Family", r"edge computing device",
    ],
    "Organizations": [
        r"AWS Organizations", r"organizational unit", r"\bOU\b", r"management account",
        r"consolidated billing", r"service control",
    ],
    "Backup": [
        r"AWS Backup", r"backup plan", r"backup vault", r"cross-region backup",
        r"recovery point",
    ],
    "EventBridge": [
        r"EventBridge", r"event bus", r"event rule", r"event pattern",
        r"scheduled rule",
    ],
    "Systems Manager": [
        r"Systems Manager", r"\bSSM\b", r"Parameter Store", r"Session Manager",
        r"Patch Manager", r"Run Command", r"OpsCenter",
    ],
    "Cost Optimization": [
        r"cost", r"pricing", r"billing", r"Savings Plan", r"reserved capacity",
        r"spot pricing", r"Cost Explorer", r"Budgets",
    ],
    "High Availability / DR": [
        r"high availability", r"fault tolerance", r"disaster recovery",
        r"RPO\b", r"RTO\b", r"failover", r"multi-region", r"pilot light",
        r"warm standby", r"active-active", r"active-passive",
    ],
    "EFS": [
        r"\bEFS\b", r"Elastic File System", r"NFS", r"shared file system",
    ],
    "EBS": [
        r"\bEBS\b", r"Elastic Block Store", r"gp2\b", r"gp3\b", r"io1\b", r"io2\b",
        r"block storage", r"volume snapshot",
    ],
    "Cognito": [
        r"Cognito", r"user pool", r"identity pool", r"federated identity",
    ],
    "AppSync": [
        r"AppSync", r"GraphQL",
    ],
    "SES": [
        r"\bSES\b", r"Simple Email Service", r"email sending",
    ],
    "Macie": [
        r"Macie", r"sensitive data", r"PII detection",
    ],
    "GuardDuty": [
        r"GuardDuty", r"threat detection", r"malicious activity",
    ],
    "Inspector": [
        r"Inspector", r"vulnerability assessment", r"CVE\b",
    ],
    "Config": [
        r"AWS Config", r"configuration compliance", r"config rule",
    ],
    "CloudTrail": [
        r"CloudTrail", r"audit log", r"API activity", r"event history",
    ],
    "Trusted Advisor": [
        r"Trusted Advisor",
    ],
    "Lightsail": [
        r"Lightsail",
    ],
    "Outposts": [
        r"Outposts", r"on-premises AWS",
    ],
    "AppFlow": [
        r"AppFlow",
    ],
    "Managed Streaming": [
        r"MSK\b", r"Managed Streaming for Apache Kafka", r"Kafka",
    ],
    "Batch": [
        r"AWS Batch", r"batch job", r"job queue",
    ],
}


def tag_question(text: str) -> list[str]:
    combined = text.lower()
    # Use original case for matching
    topics = []
    for topic, patterns in TOPIC_KEYWORDS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                topics.append(topic)
                break
    return sorted(topics)


def main():
    src = Path(__file__).parent.parent / "public" / "questions.json"
    questions = json.loads(src.read_text(encoding="utf-8"))

    for q in questions:
        searchable = q["question"] + " " + " ".join(q["options"].values())
        q["topics"] = tag_question(searchable)

    src.write_text(json.dumps(questions, ensure_ascii=False, indent=None, separators=(",", ":")), encoding="utf-8")

    # Stats
    topic_counts: dict[str, int] = {}
    untagged = 0
    for q in questions:
        if not q["topics"]:
            untagged += 1
        for t in q["topics"]:
            topic_counts[t] = topic_counts.get(t, 0) + 1

    print(f"Tagged {len(questions)} questions ({untagged} untagged)")
    print("\nTop topics:")
    for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {topic}: {count}")


if __name__ == "__main__":
    main()
