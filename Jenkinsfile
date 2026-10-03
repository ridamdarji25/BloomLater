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

        stage('GitOps - Update Kubernetes Manifests') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-creds',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )
                ]) {
                    sh '''
                        set -e

                        LAST_COMMIT_MSG=$(git log -1 --pretty=%s)
                        if echo "$LAST_COMMIT_MSG" | grep -q "^chore(gitops):"; then
                            echo "GitOps commit detected — skipping to prevent infinite loop."
                            exit 0
                        fi

                        git config user.name "Jenkins"
                        git config user.email "jenkins@localhost"

                        sed -i "s|image: riamtech/bloom-backend:.*|image: riamtech/bloom-backend:${BUILD_NUMBER}|g" \
                            k8s/backend/deployment.yml

                        sed -i "s|image: riamtech/bloom-frontend:.*|image: riamtech/bloom-frontend:${BUILD_NUMBER}|g" \
                            k8s/frontend/deployment.yml

                        git add \
                            k8s/backend/deployment.yml \
                            k8s/frontend/deployment.yml

                        if git diff --cached --quiet; then
                            echo "No manifest changes — nothing to commit."
                            exit 0
                        fi

                        git commit -m "chore(gitops): deploy BloomLater build ${BUILD_NUMBER}"

                        git push https://${GIT_USER}:${GIT_TOKEN}@github.com/ridamdarji25/BloomLater.git HEAD:main
                    '''
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
