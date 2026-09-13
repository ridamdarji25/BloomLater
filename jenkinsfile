pipeline {

    agent any

    tools {
        nodejs 'node20'
        jdk 'jdk21'
    }

    environment {
        BACKEND_IMAGE  = 'riamtech/bloom-backend'
        FRONTEND_IMAGE = 'riamtech/bloom-frontend'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                git(
                    branch: 'main',
                    credentialsId: 'github-creds',
                    url: 'https://github.com/ridamdarji25/BloomLater.git'
                )
            }
        }

        stage('Install Dependencies') {
            parallel {

                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Lint') {
            parallel {

                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint || true'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint || true'
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            parallel {

                stage('OWASP Dependency Check') {
                    steps {
                        catchError(
                            buildResult: 'SUCCESS',
                            stageResult: 'UNSTABLE'
                        ) {
                            withCredentials([
                                string(
                                    credentialsId: 'nvd-api-key',
                                    variable: 'NVD_API_KEY'
                                )
                            ]) {
                                dependencyCheck(
                                    odcInstallation: 'OWASP-DC',
                                    additionalArguments: """
                                        --scan backend/
                                        --scan frontend/
                                        --format HTML
                                        --format XML
                                        --nvdApiKey ${NVD_API_KEY}
                                        --out reports/dependency-check
                                    """
                                )

                                dependencyCheckPublisher(
                                    pattern: 'reports/dependency-check/dependency-check-report.xml'
                                )
                            }
                        }
                    }
                }

                stage('Trivy FS') {
                    steps {
                        catchError(
                            buildResult: 'SUCCESS',
                            stageResult: 'UNSTABLE'
                        ) {
                            sh '''
                                mkdir -p reports/trivy

                                trivy fs . \
                                    --severity HIGH,CRITICAL \
                                    --format table \
                                    -o reports/trivy/fs-scan.txt
                            '''
                        }
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    withCredentials([
                        string(
                            credentialsId: 'sonar-token',
                            variable: 'SONAR_TOKEN'
                        )
                    ]) {
                        sh '''
                            npx sonar-scanner \
                                -Dsonar.projectKey=BloomLater \
                                -Dsonar.projectName=BloomLater \
                                -Dsonar.sources=backend/src,frontend/src \
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/** \
                                -Dsonar.login=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Images') {
            parallel {

                stage('Backend') {
                    steps {
                        sh """
                            docker build \
                                -t ${BACKEND_IMAGE}:${BUILD_NUMBER} \
                                -t ${BACKEND_IMAGE}:latest \
                                ./backend
                        """
                    }
                }

                stage('Frontend') {
                    steps {
                        sh """
                            docker build \
                                --build-arg VITE_API_URL=/api \
                                -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} \
                                -t ${FRONTEND_IMAGE}:latest \
                                ./frontend
                        """
                    }
                }
            }
        }

        stage('Integration Tests') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'bloom-mongo-ci',
                        usernameVariable: 'MONGO_USER',
                        passwordVariable: 'MONGO_PASS'
                    )
                ]) {
                    sh '''
                        set -e

                        export CI_JWT_ACCESS_SECRET=$(openssl rand -hex 32)
                        export CI_JWT_REFRESH_SECRET=$(openssl rand -hex 32)

                        cat > docker-compose.ci.yml <<'EOF'
services:

  mongo:
    image: mongo:7
    container_name: bloom-mongo-ci
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - bloom-ci

  backend:
    image: ${BACKEND_IMAGE}:${BUILD_NUMBER}
    container_name: bloom-backend-ci
    environment:
      MONGO_URI: mongodb://${MONGO_USER}:${MONGO_PASS}@mongo:27017/bloomlater?authSource=admin
      JWT_ACCESS_SECRET: ${CI_JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${CI_JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRES_IN: 15m
      JWT_REFRESH_EXPIRES_IN: 7d
      CORS_ORIGIN: http://localhost:8080
      NODE_ENV: test
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - bloom-ci

  frontend:
    image: ${FRONTEND_IMAGE}:${BUILD_NUMBER}
    container_name: bloom-frontend-ci
    ports:
      - "8080:8080"
    depends_on:
      - backend
    networks:
      - bloom-ci

networks:
  bloom-ci:
EOF

                        docker compose \
                            -p bloom-ci \
                            -f docker-compose.ci.yml \
                            up -d

                        sleep 10

                        docker exec bloom-backend-ci \
                            wget -qO- http://localhost:4000/health

                        curl -f http://localhost:8080
                    '''
                }
            }
        }

        stage('Trivy Image Scan') {
            parallel {

                stage('Backend') {
                    steps {
                        catchError(
                            buildResult: 'SUCCESS',
                            stageResult: 'UNSTABLE'
                        ) {
                            sh """
                                trivy image \
                                    --severity HIGH,CRITICAL \
                                    ${BACKEND_IMAGE}:${BUILD_NUMBER}
                            """
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        catchError(
                            buildResult: 'SUCCESS',
                            stageResult: 'UNSTABLE'
                        ) {
                            sh """
                                trivy image \
                                    --severity HIGH,CRITICAL \
                                    ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                            """
                        }
                    }
                }
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login \
                            -u "$DOCKER_USER" \
                            --password-stdin

                        docker push "$BACKEND_IMAGE:$BUILD_NUMBER"
                        docker push "$BACKEND_IMAGE:latest"

                        docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                        docker push "$FRONTEND_IMAGE:latest"

                        docker logout
                    '''
                }
            }
        }
    }

    post {

        always {
            sh '''
                docker compose \
                    -p bloom-ci \
                    -f docker-compose.ci.yml \
                    down -v --remove-orphans || true

                rm -f docker-compose.ci.yml
            '''

            archiveArtifacts(
                artifacts: 'reports/**/*',
                allowEmptyArchive: true
            )

            cleanWs()
        }

        success {
            mail(
                to: 'ridamproxy122@gmail.com',
                from: 'ridamtailor@gmail.com',
                subject: "BloomLater Build #${BUILD_NUMBER} - SUCCESS",
                body: """Build succeeded.

Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Branch: main

Images:
${BACKEND_IMAGE}:${BUILD_NUMBER}
${FRONTEND_IMAGE}:${BUILD_NUMBER}

Build URL:
${BUILD_URL}"""
            )
        }

        failure {
            mail(
                to: 'ridamproxy122@gmail.com',
                from: 'ridamtailor@gmail.com',
                subject: "BloomLater Build #${BUILD_NUMBER} - FAILED",
                body: """Build FAILED.

Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}
Branch: main

Console:
${BUILD_URL}console"""
            )
        }

        unstable {
            mail(
                to: 'ridamproxy122@gmail.com',
                from: 'ridamtailor@gmail.com',
                subject: "BloomLater Build #${BUILD_NUMBER} - UNSTABLE",
                body: """Build is UNSTABLE.

Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}

Console:
${BUILD_URL}console"""
            )
        }
    }
}