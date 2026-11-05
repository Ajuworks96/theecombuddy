const token = "dd2752a5-6b12-4bb0-a2c0-61b57a605234";
const projectId = "e7f2c666-f807-4e83-bad3-c5e3347410fe";
const environmentId = "a9617fe7-509f-439c-ba15-5998b5bf714f";
const apiServiceId = "8ddae34f-3424-4ee5-92df-36de276d48f7";
const workerServiceId = "3eebc10a-9f62-478a-a7f4-9a8d4c634707";

async function query(q, vars) {
  const res = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: q, variables: vars }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error("GraphQL Errors:", JSON.stringify(data.errors, null, 2));
    throw new Error(data.errors[0].message);
  }
  return data.data;
}

async function main() {
  console.log("1. Configuring medusa-api service instance...");
  await query(
    `
    mutation UpdateApiInstance($envId: String, $svcId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(environmentId: $envId, serviceId: $svcId, input: $input)
    }
  `,
    {
      envId: environmentId,
      svcId: apiServiceId,
      input: {
        dockerfilePath: "deploy/Dockerfiles/Dockerfile.backend",
        healthcheckPath: "/health",
        healthcheckTimeout: 15,
      },
    }
  );
  console.log("   medusa-api service instance configured.");

  console.log("2. Configuring medusa-worker service instance...");
  await query(
    `
    mutation UpdateWorkerInstance($envId: String, $svcId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(environmentId: $envId, serviceId: $svcId, input: $input)
    }
  `,
    {
      envId: environmentId,
      svcId: workerServiceId,
      input: {
        dockerfilePath: "deploy/Dockerfiles/Dockerfile.backend",
        startCommand: "npm run start --workspace=@the-ecom-buddy/backend",
      },
    }
  );
  console.log("   medusa-worker service instance configured.");

  console.log("3. Setting environment variables for medusa-api...");
  await query(
    `
    mutation UpsertApiVars($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `,
    {
      input: {
        projectId,
        environmentId,
        serviceId: apiServiceId,
        skipDeploys: false,
        variables: {
          PORT: "9000",
          NODE_ENV: "production",
          DATABASE_URL: "${{Postgres.DATABASE_URL}}",
          REDIS_URL: "${{Redis.REDIS_URL}}",
          JWT_SECRET: "supersecret_ecom_buddy_jwt_token_production_only_2026",
          COOKIE_SECRET: "supersecret_ecom_buddy_cookie_token_production_only_2026",
          GUEST_ORDER_SECRET: "supersecret_ecom_buddy_jwt_token_production_only_2026",
          STORE_CORS:
            "https://the-ecom-buddy-storefront.vercel.app,https://the-ecom-buddy-storefront-*.vercel.app",
          ADMIN_CORS:
            "https://the-ecom-buddy-merchant.vercel.app,https://the-ecom-buddy-merchant-*.vercel.app",
          AUTH_CORS:
            "https://the-ecom-buddy-storefront.vercel.app,https://the-ecom-buddy-merchant.vercel.app,https://the-ecom-buddy-storefront-*.vercel.app,https://the-ecom-buddy-merchant-*.vercel.app",
          MEDUSA_BACKEND_URL: "https://medusa-api-production-5c77.up.railway.app",
          MEDUSA_WORKER_MODE: "server",
          MEDUSA_DISABLE_TELEMETRY: "1",
        },
      },
    }
  );
  console.log("   medusa-api variables set.");

  console.log("4. Setting environment variables for medusa-worker...");
  await query(
    `
    mutation UpsertWorkerVars($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `,
    {
      input: {
        projectId,
        environmentId,
        serviceId: workerServiceId,
        skipDeploys: false,
        variables: {
          NODE_ENV: "production",
          DATABASE_URL: "${{Postgres.DATABASE_URL}}",
          REDIS_URL: "${{Redis.REDIS_URL}}",
          JWT_SECRET: "supersecret_ecom_buddy_jwt_token_production_only_2026",
          COOKIE_SECRET: "supersecret_ecom_buddy_cookie_token_production_only_2026",
          GUEST_ORDER_SECRET: "supersecret_ecom_buddy_jwt_token_production_only_2026",
          MEDUSA_WORKER_MODE: "worker",
          MEDUSA_DISABLE_TELEMETRY: "1",
        },
      },
    }
  );
  console.log("   medusa-worker variables set.");
  console.log("All Railway configurations completed successfully!");
}

main().catch(console.error);

