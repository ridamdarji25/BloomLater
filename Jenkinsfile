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

        stage('Checkout Source Code') {
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

                stage('Install Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }

                stage('Install Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Code Linting') {
            parallel {

                stage('Backend Lint Check') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint || true'
                        }
                    }
                }

                stage('Frontend Lint Check') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint || true'
                        }
                    }
                }
            }
        }

        stage('Security Scanning') {
            parallel {

                stage('OWASP Dependency Vulnerability Scan') {
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

                stage('Trivy Filesystem Security Scan') {
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

        stage('SonarQube Code Quality Analysis') {
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

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Images') {
            parallel {

                stage('Build Backend Docker Image') {
                    steps {
                        sh """
                            docker build \
                                -t ${BACKEND_IMAGE}:${BUILD_NUMBER} \
                                -t ${BACKEND_IMAGE}:latest \
                                ./backend
                        """
                    }
                }

                stage('Build Frontend Docker Image') {
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

        stage('MongoDB + Backend Integration Test') {
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

                        docker network create bloom-validation 2>/dev/null || true

                        docker run -d \
                            --name bloom-mongo-validation \
                            --network bloom-validation \
                            -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
                            -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
                            mongo:7

                        echo "Waiting for MongoDB..."

                        MONGO_READY=false

                        for i in $(seq 1 20); do

                            if docker exec bloom-mongo-validation \
                                mongosh \
                                -u "$MONGO_USER" \
                                -p "$MONGO_PASS" \
                                --authenticationDatabase admin \
                                --eval "db.adminCommand('ping')" \
                                >/dev/null 2>&1; then

                                echo "MongoDB is healthy"
                                MONGO_READY=true
                                break
                            fi

                            echo "MongoDB not ready - attempt ${i}/20"

                            sleep 3
                        done

                        if [ "$MONGO_READY" != "true" ]; then
                            echo "MongoDB health check failed"
                            docker logs bloom-mongo-validation || true
                            exit 1
                        fi

                        docker run -d \
                            --name bloom-backend-validation \
                            --network bloom-validation \
                            -e MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASS}@bloom-mongo-validation:27017/bloomlater?authSource=admin" \
                            -e JWT_ACCESS_SECRET="$CI_JWT_ACCESS_SECRET" \
                            -e JWT_REFRESH_SECRET="$CI_JWT_REFRESH_SECRET" \
                            -e JWT_ACCESS_EXPIRES_IN=15m \
                            -e JWT_REFRESH_EXPIRES_IN=7d \
                            -e CORS_ORIGIN=http://localhost:8080 \
                            -e NODE_ENV=test \
                            "${BACKEND_IMAGE}:${BUILD_NUMBER}"

                        echo "Waiting for Backend..."

                        BACKEND_READY=false

                        for i in $(seq 1 20); do

                            if docker exec bloom-backend-validation \
                                wget -qO- http://127.0.0.1:4000/health; then

                                echo "Backend is healthy"
                                BACKEND_READY=true
                                break
                            fi

                            echo "Backend not ready - attempt ${i}/20"

                            docker logs --tail 20 bloom-backend-validation || true

                            sleep 3
                        done

                        if [ "$BACKEND_READY" != "true" ]; then
                            echo "Backend health check failed"

                            docker logs bloom-mongo-validation || true
                            docker logs bloom-backend-validation || true

                            exit 1
                        fi

                        echo "Backend health check passed"
                        echo "MongoDB + Backend integration test passed"

                        docker exec bloom-backend-validation \
                            wget -qO- http://127.0.0.1:4000/health
                    '''
                }
            }
        }

        stage('Container Image Security Scanning') {
            parallel {

                stage('Trivy Backend Image Scan') {
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

                stage('Trivy Frontend Image Scan') {
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

        stage('Push Docker Images') {
            parallel {

                stage('Push Backend Image to Docker Hub') {
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

                                docker logout
                            '''
                        }
                    }
                }

                stage('Push Frontend Image to Docker Hub') {
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

                                docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                                docker push "$FRONTEND_IMAGE:latest"

                                docker logout
                            '''
                        }
                    }
                }
            }
        }
    }

    post {

        always {
            sh '''
                docker rm -f \
                    bloom-backend-validation \
                    bloom-mongo-validation 2>/dev/null || true

                docker network rm bloom-validation 2>/dev/null || true

                docker image prune -af || true
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

Backend Image:
${BACKEND_IMAGE}:${BUILD_NUMBER}

Frontend Image:
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