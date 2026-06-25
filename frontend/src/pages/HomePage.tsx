import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Presentation Tier',
    tech: 'React + Vite + NGINX',
    folder: 'frontend/',
    port: '5173 / 80',
    description: 'Serves the SPA to users via CloudFront and an Elastic Load Balancer across public subnets in multiple availability zones.',
  },
  {
    name: 'Application Tier',
    tech: 'Node.js + Express',
    folder: 'backend/',
    port: '3200',
    description: 'REST API in private subnets — handles business logic, JWT authentication, and communicates with the data tier only.',
  },
  {
    name: 'Data Tier',
    tech: 'MySQL 8.0 (RDS)',
    folder: 'data-tier/',
    port: '3306',
    description: 'Primary database with standby failover in a separate AZ. Stores properties, agents, and user accounts.',
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-eyebrow">High-Availability 3-Tier Architecture</p>
          <h1 className="home-title">bldbusiness on AWS</h1>
          <p className="home-lead">
            A property management application deployed across three isolated tiers for security,
            scalability, and fault tolerance — spanning multiple availability zones in us-east-1.
          </p>
          <div className="home-cta">
            <Link to="/dashboard" className="btn btn-primary">
              View dashboard
            </Link>
            <Link to="/properties" className="btn btn-ghost">
              Browse properties
            </Link>
          </div>
        </div>
      </section>

      <section className="home-architecture">
        <div className="home-section-header">
          <h2 className="home-section-title">Architecture Overview</h2>
          <p className="home-section-subtitle">
            Route 53 → CloudFront → WAF → Web Tier → App Tier → RDS with multi-AZ failover
          </p>
        </div>

        <figure className="architecture-figure card card-elevated">
          <img
            src="/3TierArch.png"
            alt="High-Availability 3-Tier Architecture on AWS showing Route 53, CloudFront, WAF, Web Tier with ELB and Auto Scaling, Application Tier with private ELB, and RDS database tier with primary and standby instances across us-east-1a and us-east-1b"
            className="architecture-diagram"
          />
          <figcaption className="architecture-caption">
            3-Tier AWS architecture — Web (public), Application (private), and Database (private) tiers
            with Auto Scaling Groups, NAT gateways, and RDS multi-AZ replication.
          </figcaption>
        </figure>
      </section>

      <section className="home-tiers">
        <div className="home-section-header">
          <h2 className="home-section-title">Application Tiers</h2>
          <p className="home-section-subtitle">
            Each tier runs in its own folder with isolated configuration and deployment scripts
          </p>
        </div>

        <div className="tier-grid">
          {tiers.map((tier, index) => (
            <article key={tier.name} className="tier-card card">
              <span className="tier-number">Tier {index + 1}</span>
              <h3 className="tier-name">{tier.name}</h3>
              <p className="tier-tech">{tier.tech}</p>
              <p className="tier-description">{tier.description}</p>
              <dl className="tier-meta">
                <div>
                  <dt>Folder</dt>
                  <dd><code>{tier.folder}</code></dd>
                </div>
                <div>
                  <dt>Port</dt>
                  <dd><code>{tier.port}</code></dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
