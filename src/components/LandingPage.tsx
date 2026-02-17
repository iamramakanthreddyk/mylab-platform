import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      {/* Flowing Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-green-100 rounded-full opacity-30 animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-purple-100 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-indigo-100 rounded-full opacity-25 animate-bounce" style={{animationDelay: '0.5s'}}></div>

        {/* Flowing Lines */}
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 800" fill="none">
          <path d="M0 200 Q300 150 600 200 T1200 200" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="8s" repeatCount="indefinite" />
          </path>
          <path d="M0 400 Q400 350 800 400 T1200 400" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M0 600 Q500 550 1000 600 T1200 600" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,1000;1000,0" dur="10s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Flow Chemistry Tube Icons */}
      </div>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img src="/tekflow-logo.png" alt="TekFlow Labs Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-bold text-gray-900">TekFlow Labs</h1>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Login to MyLab
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Flow Chemistry Graphics */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-linear-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
              TekFlow Labs
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-4 font-light">
              Revolutionizing Chemical Engineering Through
            </p>
            <p className="text-3xl md:text-4xl font-bold text-blue-600 mb-8">
              Flow Chemistry Innovation
            </p>
          </div>

          {/* Flow Chemistry Process Visualization */}
          <div className="mt-16 relative">
            {/* Central Flow Reactor */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Flow Reactor Tube */}
                <svg width="400" height="120" viewBox="0 0 400 120" className="drop-shadow-lg">
                  {/* Outer Tube */}
                  <path d="M50 60 Q100 30 200 60 Q300 90 350 60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                  {/* Inner Flowing Liquid */}
                  <path d="M50 60 Q100 30 200 60 Q300 90 350 60" stroke="url(#flowGradient)" strokeWidth="6" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,400;400,0" dur="3s" repeatCount="indefinite" />
                  </path>
                  {/* Reactor Coils */}
                  <circle cx="200" cy="60" r="15" stroke="#3B82F6" strokeWidth="2" fill="none" opacity="0.3" />
                  <circle cx="200" cy="60" r="25" stroke="#10B981" strokeWidth="2" fill="none" opacity="0.2" />
                  <circle cx="200" cy="60" r="35" stroke="#8B5CF6" strokeWidth="2" fill="none" opacity="0.1" />

                  {/* Flowing Particles */}
                  <circle cx="50" cy="60" r="3" fill="#3B82F6">
                    <animateMotion dur="3s" repeatCount="indefinite">
                      <path d="M0 0 Q50 -30 150 0 Q250 30 300 0" />
                    </animateMotion>
                  </circle>
                  <circle cx="50" cy="60" r="2" fill="#10B981">
                    <animateMotion dur="3s" repeatCount="indefinite" begin="0.5s">
                      <path d="M0 0 Q50 -30 150 0 Q250 30 300 0" />
                    </animateMotion>
                  </circle>
                  <circle cx="50" cy="60" r="2.5" fill="#8B5CF6">
                    <animateMotion dur="3s" repeatCount="indefinite" begin="1s">
                      <path d="M0 0 Q50 -30 150 0 Q250 30 300 0" />
                    </animateMotion>
                  </circle>
                </svg>

                {/* Gradient Definition */}
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="33%" stopColor="#10B981" />
                      <stop offset="66%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#EF4444" />
                      <animate attributeName="x1" values="0%;100%;0%" dur="4s" repeatCount="indefinite" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Raw Materials</span>
              </div>
              <div className="w-16 h-0.5 bg-linear-to-r from-blue-500 to-purple-500"></div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
                <span>Flow Reactor</span>
              </div>
              <div className="w-16 h-0.5 bg-linear-to-r from-purple-500 to-green-500"></div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Products</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-900">About Us</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 text-xl">🔬</span>
              </div>
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">About Us</h4>
              <p className="text-gray-600 mb-6">
                Young & Nimble, TEKFLOW LABS Pvt. Ltd. is a privately held Project Management company founded by a team of Pharma professionals with 8+ years of experience in flow chemistry process optimization. We are process intensification enthusiasts, with background of chemical engineering having excellent academic records, sound technology expertise and implementation skills.
              </p>
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">Our Mission</h4>
              <p className="text-gray-600 mb-6">
                To make conventional chemical production routes greener, safer, smaller, faster and cost-effective.
              </p>
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">Our Vision</h4>
              <p className="text-gray-600">
                To make process intensification and flow chemistry, available, applicable and affordable for chemical industries and create a greener impact over Indian Chemical Industry.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-green-600 text-xl">🤝</span>
              </div>
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">Strategic Partners</h4>
              <p className="text-gray-600 mb-4">
                We are proud to collaborate with innovative and forward-thinking companies. One of our esteemed Partner is Flowrhex, a leader in the field of flow chemistry technology.
              </p>
              <div className="bg-gray-100 p-6 rounded-lg mb-4 flex items-center justify-center">
                <img src="https://media.licdn.com/dms/image/v2/C510BAQFiGvS7T8mXIw/company-logo_200_200/company-logo_200_200/0/1630625342573/flowrhex_technologies_logo?e=2147483647&v=beta&t=lD5ShjQ3VCprqwC_xVMlRWseZfWSXaNSkrkKBsKqFXE" alt="Flowrhex Logo" className="h-20 w-auto object-contain" />
              </div>
              <p className="text-gray-600">
                Flowrhex is revolutionizing flow chemistry with their cutting-edge technology. We are thrilled to support and enhance their mission through our expertise in process intensification and chemical process development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services with Flow Graphics */}
      <section id="services" className="bg-white py-16 relative overflow-hidden">
        {/* Flowing Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none">
            <path d="M0 300 Q300 250 600 300 T1200 300" stroke="currentColor" strokeWidth="1" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="15s" repeatCount="indefinite" />
            </path>
            <path d="M0 200 Q400 150 800 200 T1200 200" stroke="currentColor" strokeWidth="1" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="12s" repeatCount="indefinite" />
            </path>
            <path d="M0 400 Q500 350 1000 400 T1200 400" stroke="currentColor" strokeWidth="1" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="18s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-900">Services we offer</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-8 rounded-lg shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-4 right-4 w-20 h-20 opacity-20">
                <div className="w-full h-full border-2 border-blue-400 rounded-full animate-spin" style={{animationDuration: '8s'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>

              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6 relative z-10">
                <span className="text-white font-bold text-2xl">TT</span>
              </div>
              <h4 className="text-3xl font-semibold mb-6 text-gray-900">1. Technology Transfer</h4>
              <p className="text-gray-600 mb-4">
                Tekflow labs offers Technology Transfer (TT) to its clients in the pharmaceutical/chemical industry via the process of transferring the technology and knowledge to its clients about the manufacturing of their drugs through continuous process. This process is often necessary when our clients want to bring a new drug to market and needs to scale up production to meet demand.
              </p>
              <p className="text-gray-600 mb-4">There are several steps involved in the technology transfer process and these may include:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Identifying the appropriate technology and equipment needed for production</li>
                <li>Establishing a detailed process flow diagram</li>
                <li>Developing process control strategies and scale-up methods</li>
                <li>Transferring the process to the receiving organization through training, documentation, and validation</li>
                <li>Ensuring that the receiving organization is capable of consistently producing the drug to the required quality standards</li>
              </ul>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100 p-8 rounded-lg shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-4 right-4 w-20 h-20 opacity-20">
                <div className="w-full h-full border-2 border-green-400 rounded-full animate-spin" style={{animationDuration: '6s'}}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>

              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 relative z-10">
                <span className="text-white font-bold text-2xl">PI</span>
              </div>
              <h4 className="text-3xl font-semibold mb-6 text-gray-900">2. Process intensification</h4>
              <p className="text-gray-600 mb-4">
                We provide dedicated flow technology equipment's at every single stage as per the client requirements whether it is for pilot or plant level, we efficiently conduct route scouting, rapid process development, optimization of reaction conditions for scale-up of materials.
              </p>
              <p className="text-gray-600 mb-4">
                Our continuous flow processing capabilities offer unique advantages compared with batch processes, resulting in faster, safer and more robust material production with higher selectivity of desired products.
              </p>
              <p className="text-gray-600 mb-4">Our expert equipment and capabilities include:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Tubular reactors and static mixers to handle multiple batch sizes (mg to kilogram scale)</li>
                <li>Plate type micro reactor for Reaction that require micro mixing</li>
                <li>Pilot and commercial units for hydrogenation</li>
                <li>Custom build reactors for high temperature reactions (100 to 300°C)</li>
                <li>Ability to scale extreme temperatures (reactions from -80 °C to RT using tubes and tube-in-tube reactors)</li>
                <li>Ability to scale hazardous chemistry</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Business Model with Flow Graphics */}
      <section id="business-model" className="bg-gray-50 py-16 relative overflow-hidden">
        {/* Flowing Connection Lines */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-linear-to-r from-blue-200 via-green-200 via-purple-200 via-red-200 to-transparent opacity-30 hidden md:block"></div>

        <div className="container mx-auto px-6 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-900">Our Business Model</h3>
          <h4 className="text-3xl font-semibold text-center mb-8 text-gray-900">TEKFLOW Continuous Flow Chemistry</h4>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center relative">
              {/* Flow Arrow */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center opacity-50 hidden md:flex">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">1</span>
              </div>
              <h5 className="text-xl font-semibold mb-4 text-gray-900">STAGE 1: Proof of Concept</h5>
              <p className="text-gray-600 text-sm mb-4">
                Stage 1 involves confirmation of reaction validity under continuous flow including assessment of solubility of starting materials, reagents and products, as well as confirmation of product formation. Various parameters will be investigated such as stoichiometry, flow rates and temperature.
              </p>
              <p className="text-blue-600 font-semibold">Duration: 3-6 weeks</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center relative">
              {/* Flow Arrow */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center opacity-50 hidden md:flex">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '0.5s'}}>
                <span className="text-white font-bold">2</span>
              </div>
              <h5 className="text-xl font-semibold mb-4 text-gray-900">STAGE 2: Process Robustness</h5>
              <p className="text-gray-600 text-sm mb-4">
                Stage 2 is a test of the process robustness to define safe operating windows for parameters as the process is further developed for scale-up. This stage also includes confirmation of flowability, hazard assessment and preparation of a process description (PD).
              </p>
              <p className="text-green-600 font-semibold">Duration: 4-6 weeks</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center relative">
              {/* Flow Arrow */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center opacity-50 hidden md:flex">
                <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '1s'}}>
                <span className="text-white font-bold">3</span>
              </div>
              <h5 className="text-xl font-semibold mb-4 text-gray-900">STAGE 3: Pilot Demonstration</h5>
              <p className="text-gray-600 text-sm mb-4">
                With PD prepared, a demo batch of 1 kg can be carried out on intermediate equipment from lab scale to manufacture. This generates material for customer assessment and critical information for further scale-up if needed.
              </p>
              <p className="text-purple-600 font-semibold">Duration: 2-5 weeks</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '1.5s'}}>
                <span className="text-white font-bold">4</span>
              </div>
              <h5 className="text-xl font-semibold mb-4 text-gray-900">STAGE 4: Manufacture</h5>
              <p className="text-gray-600 text-sm mb-4">
                Manufacture will involve design and construction of a suitable flow rig, full safety testing around the process and delivery of the required amount of product with an agreed specification. At the end of each Stage there is a Go- or No-Go decision made in agreement with the customer.
              </p>
              <p className="text-red-600 font-semibold">Output: mT/week possible</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Intensification with Flow Graphics */}
      <section id="technology" className="bg-white py-16 relative overflow-hidden">
        {/* Flowing Chemical Streams Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 400" fill="none">
            <defs>
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <path d="M0 100 Q300 80 600 100 T1200 100" stroke="url(#flowGradient)" strokeWidth="3" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="20s" repeatCount="indefinite" />
            </path>
            <path d="M0 200 Q400 180 800 200 T1200 200" stroke="url(#flowGradient)" strokeWidth="2" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="15s" repeatCount="indefinite" />
            </path>
            <path d="M0 300 Q500 280 1000 300 T1200 300" stroke="url(#flowGradient)" strokeWidth="2" fill="none">
              <animate attributeName="stroke-dasharray" values="0,2000;2000,0" dur="25s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-900">Process Intensification and Flow Chemistry</h3>
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-gray-600 text-center mb-8 text-lg">
              Flow chemistry is a modern technique used for synthesis that utilizes pumps, tubing, and reactor coils rather than traditional round-bottomed flasks found in batch applications, allowing for faster reactivity, increased mass/heat transfer, increased safety. It involves running chemical reactions in a continuous flow of reagents through a reactor, as opposed to traditional batch chemistry where reactants are mixed and allowed to react in a single vessel.
            </p>
            <p className="text-gray-600 text-center mb-8 text-lg">
              Flow chemistry has several advantages, including improved control over reaction parameters, safety, and scalability. In terms of "doable" and "demanding" molecules in the market, the applicability of flow chemistry depends on various factors, such as the specific type of reaction and the complexity of the molecules involved. Continuous Flow Chemistry opens up the possibility to access new synthetic routes to a given intermediate or API which are not achievable in conventional batch mode due to issues around safety, impurity formation and the instability of reactive intermediates.
            </p>
            <p className="text-gray-600 text-center mb-8 text-lg font-semibold">
              Choosing Continuous flow offers a variety of advantages over traditional batch processing. There are five strategic drivers towards choosing Flow Chemistry over traditional batch with TEKFLOW.
            </p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
            <div className="bg-blue-50 p-6 rounded-lg text-center shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
                <div className="w-full h-full border-2 border-blue-400 rounded-full animate-spin" style={{animationDuration: '4s'}}></div>
              </div>

              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Faster Reactions</h4>
              <p className="text-gray-600 text-sm">
                Typically, under continuous flow, reactions are faster due to improved mixing and better heat transfer resulting from the smaller-scale architectures offering higher surface area to volume compared with traditional batch vessels.
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg text-center shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
                <div className="w-full h-full border-2 border-green-400 rounded-full animate-spin" style={{animationDuration: '5s'}}></div>
              </div>

              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '0.2s'}}>
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Safer Reactions</h4>
              <p className="text-gray-600 text-sm">
                Continuous flow is inherently safer due to the small volumes reacting at any one time, with reactive intermediates/hazardous reagents handled in situ.
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg text-center shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
                <div className="w-full h-full border-2 border-purple-400 rounded-full animate-spin" style={{animationDuration: '6s'}}></div>
              </div>

              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '0.4s'}}>
                <span className="text-white text-xl">🔬</span>
              </div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Challenging Reactions</h4>
              <p className="text-gray-600 text-sm">
                Reactions which are difficult to scale up in batch, such as high pressure, high energy, oxidation, or photochemical, can be performed under continuous flow.
              </p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg text-center shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
                <div className="w-full h-full border-2 border-yellow-400 rounded-full animate-spin" style={{animationDuration: '7s'}}></div>
              </div>

              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '0.6s'}}>
                <span className="text-white text-xl">⭐</span>
              </div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Product Quality</h4>
              <p className="text-gray-600 text-sm">
                Tight controls of stoichiometry improve product quality. In-line monitoring can identify a change in product quality and allow for diversion to waste, eliminating failed batches. The ability to perform a controlled quench means a simple work-up with a reduced number of handling steps is typically required.
              </p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-lg text-center shadow-sm relative overflow-hidden">
              {/* Flow Animation */}
              <div className="absolute top-2 right-2 w-8 h-8 opacity-30">
                <div className="w-full h-full border-2 border-indigo-400 rounded-full animate-spin" style={{animationDuration: '8s'}}></div>
              </div>

              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{animationDelay: '0.8s'}}>
                <span className="text-white text-xl">📦</span>
              </div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Smaller Footprints</h4>
              <p className="text-gray-600 text-sm">
                Equipment is much smaller than typical batch vessels, with the ability to tailor the flow rig to suit the process and produce higher unit productivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flow Reactor Demonstration */}
      <section className="bg-linear-to-r from-gray-50 to-blue-50 py-20">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-16 text-gray-900">Flow Chemistry in Action</h3>

          <div className="max-w-6xl mx-auto">
            {/* Main Flow Reactor Visualization */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
              <div className="text-center mb-8">
                <h4 className="text-2xl font-semibold text-gray-900 mb-4">Continuous Flow Reactor System</h4>
                <p className="text-gray-600">Advanced flow chemistry technology for precise chemical synthesis</p>
              </div>

              <div className="relative">
                {/* Enhanced Flow Reactor Setup */}
                <svg width="100%" height="350" viewBox="0 0 900 350" className="mx-auto">
                  {/* Background Grid and Gradients */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F3F4F6" strokeWidth="0.5"/>
                    </pattern>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </filter>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <linearGradient id="tubeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F3F4F6" />
                      <stop offset="50%" stopColor="#E5E7EB" />
                      <stop offset="100%" stopColor="#F3F4F6" />
                    </linearGradient>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
                      <stop offset="15%" stopColor="#06B6D4" stopOpacity="0.9" />
                      <stop offset="30%" stopColor="#10B981" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9" />
                      <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.85" />
                      <stop offset="85%" stopColor="#EF4444" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
                      <animateTransform attributeName="gradientTransform" type="translate" values="0,0;-150,0;0,0" dur="4s" repeatCount="indefinite" />
                    </linearGradient>
                    <radialGradient id="reactorGlow">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
                    </radialGradient>
                  </defs>
                  <rect width="900" height="350" fill="url(#grid)" />
                  <rect width="900" height="350" fill="url(#radialGradient)" opacity="0.05" />

                  {/* Input Reservoirs with Enhanced Styling */}
                  <rect x="30" y="120" width="60" height="80" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2.5" rx="8" filter="url(#shadow)" />
                  <rect x="32" y="122" width="56" height="76" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" rx="7" />
                  <rect x="45" y="140" width="30" height="40" fill="#3B82F6" opacity="0.85" rx="4" filter="url(#glow)" />
                  <circle cx="60" cy="145" r="3" fill="#FFFFFF" opacity="0.6" />
                  <text x="60" y="210" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="bold">Reactant A</text>

                  <rect x="30" y="220" width="60" height="80" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2.5" rx="8" filter="url(#shadow)" />
                  <rect x="32" y="222" width="56" height="76" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" rx="7" />
                  <rect x="45" y="240" width="30" height="40" fill="#10B981" opacity="0.85" rx="4" filter="url(#glow)" />
                  <circle cx="60" cy="245" r="3" fill="#FFFFFF" opacity="0.6" />
                  <text x="60" y="310" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="bold">Reactant B</text>

                  {/* Pumps with Animation */}
                  <g filter="url(#shadow)">
                    <circle cx="120" cy="160" r="22" fill="#1F2937" />
                    <circle cx="120" cy="160" r="18" fill="#374151" />
                    <circle cx="120" cy="160" r="12" fill="#6B7280" />
                    <circle cx="120" cy="160" r="8" fill="#9CA3AF" opacity="0.7">
                      <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="120" y="165" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PUMP</text>
                  </g>

                  <g filter="url(#shadow)">
                    <circle cx="120" cy="260" r="22" fill="#1F2937" />
                    <circle cx="120" cy="260" r="18" fill="#374151" />
                    <circle cx="120" cy="260" r="12" fill="#6B7280" />
                    <circle cx="120" cy="260" r="8" fill="#9CA3AF" opacity="0.7">
                      <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
                    </circle>
                    <text x="120" y="265" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PUMP</text>
                  </g>

                  {/* Inlet Tubes with Flow Animation */}
                  <line x1="90" y1="160" x2="100" y2="160" stroke="#6B7280" strokeWidth="6" />
                  <line x1="90" y1="160" x2="100" y2="160" stroke="url(#flowGradient)" strokeWidth="4" strokeDasharray="0,20">
                    <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="1s" repeatCount="indefinite" />
                  </line>

                  <line x1="90" y1="260" x2="100" y2="260" stroke="#6B7280" strokeWidth="6" />
                  <line x1="90" y1="260" x2="100" y2="260" stroke="url(#flowGradient)" strokeWidth="4" strokeDasharray="0,20">
                    <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="1s" repeatCount="indefinite" begin="0.5s" />
                  </line>

                  {/* Flow Control Valves */}
                  <rect x="100" y="150" width="20" height="20" fill="#DC2626" rx="2" />
                  <rect x="100" y="250" width="20" height="20" fill="#DC2626" rx="2" />

                  {/* Connecting Tubes to Mixing Chamber */}
                  <line x1="120" y1="160" x2="135" y2="185" stroke="#6B7280" strokeWidth="6" />
                  <line x1="120" y1="160" x2="135" y2="185" stroke="url(#flowGradient)" strokeWidth="4" strokeDasharray="0,25">
                    <animate attributeName="stroke-dasharray" values="0,25;25,0" dur="1.5s" repeatCount="indefinite" />
                  </line>

                  <line x1="120" y1="260" x2="135" y2="235" stroke="#6B7280" strokeWidth="6" />
                  <line x1="120" y1="260" x2="135" y2="235" stroke="url(#flowGradient)" strokeWidth="4" strokeDasharray="0,25">
                    <animate attributeName="stroke-dasharray" values="0,25;25,0" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
                  </line>

                  {/* Mixing Chamber with Enhanced Effects */}
                  <circle cx="160" cy="210" r="28" fill="url(#reactorGlow)" />
                  <circle cx="160" cy="210" r="25" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="3" filter="url(#shadow)" />
                  <circle cx="160" cy="210" r="24" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.4" />
                  <circle cx="160" cy="210" r="15" fill="#8B5CF6" opacity="0.4" />
                  <circle cx="160" cy="210" r="12" fill="#A78BFA" opacity="0.3">
                    <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x="160" y="216" textAnchor="middle" fill="#4C1D95" fontSize="11" fontWeight="bold">MIX</text>

                  {/* Connection from Mixing Chamber to Reactor */}
                  <line x1="185" y1="210" x2="185" y2="210" stroke="#6B7280" strokeWidth="8" />
                  <line x1="185" y1="210" x2="185" y2="210" stroke="url(#flowGradient)" strokeWidth="6" strokeDasharray="0,30">
                    <animate attributeName="stroke-dasharray" values="0,30;30,0" dur="2s" repeatCount="indefinite" />
                  </line>

                  {/* Main Reactor Coil with Shadow */}
                  <path d="M185 210 Q235 180 285 210 Q335 240 385 210 Q435 180 485 210 Q535 240 585 210 Q635 180 685 210 Q735 240 785 210"
                        stroke="rgba(0,0,0,0.1)" strokeWidth="18" fill="none" filter="url(#shadow)" />
                  <path d="M185 210 Q235 180 285 210 Q335 240 385 210 Q435 180 485 210 Q535 240 585 210 Q635 180 685 210 Q735 240 785 210"
                        stroke="url(#tubeGradient)" strokeWidth="16" fill="none" />
                  <path d="M185 210 Q235 180 285 210 Q335 240 385 210 Q435 180 485 210 Q535 240 585 210 Q635 180 685 210 Q735 240 785 210"
                        stroke="url(#tubeGradient)" strokeWidth="14" fill="none" opacity="0.5" />

                  {/* Flowing Reaction Mixture with Glow */}
                  <path d="M185 210 Q235 180 285 210 Q335 240 385 210 Q435 180 485 210 Q535 240 585 210 Q635 180 685 210 Q735 240 785 210"
                        stroke="url(#flowGradient)" strokeWidth="14" fill="none" strokeDasharray="0,600" opacity="0.7" filter="url(#glow)">
                    <animate attributeName="stroke-dasharray" values="0,600;600,0" dur="4s" repeatCount="indefinite" />
                  </path>
                  <path d="M185 210 Q235 180 285 210 Q335 240 385 210 Q435 180 485 210 Q535 240 585 210 Q635 180 685 210 Q735 240 785 210"
                        stroke="url(#flowGradient)" strokeWidth="11" fill="none" strokeDasharray="0,600">
                    <animate attributeName="stroke-dasharray" values="0,600;600,0" dur="4s" repeatCount="indefinite" />
                  </path>

                  {/* Flow Particles with Glow */}
                  <circle cx="185" cy="210" r="6" fill="#3B82F6" opacity="0.6" filter="url(#glow)">
                    <animateMotion dur="4s" repeatCount="indefinite">
                      <path d="M0 0 Q50 -30 100 0 Q150 30 200 0 Q250 -30 300 0 Q350 30 400 0 Q450 -30 500 0 Q550 30 600 0 Q650 -30 700 0 Q750 30 800 0" />
                    </animateMotion>
                    <animate attributeName="r" values="5;7;5" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="185" cy="210" r="5" fill="#06B6D4" opacity="0.7" filter="url(#glow)">
                    <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
                      <path d="M0 0 Q50 -30 100 0 Q150 30 200 0 Q250 -30 300 0 Q350 30 400 0 Q450 -30 500 0 Q550 30 600 0 Q650 -30 700 0 Q750 30 800 0" />
                    </animateMotion>
                    <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="185" cy="210" r="5.5" fill="#8B5CF6" opacity="0.65" filter="url(#glow)">
                    <animateMotion dur="4s" repeatCount="indefinite" begin="2s">
                      <path d="M0 0 Q50 -30 100 0 Q150 30 200 0 Q250 -30 300 0 Q350 30 400 0 Q450 -30 500 0 Q550 30 600 0 Q650 -30 700 0 Q750 30 800 0" />
                    </animateMotion>
                    <animate attributeName="r" values="4.5;6.5;4.5" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="185" cy="210" r="4.5" fill="#F59E0B" opacity="0.7" filter="url(#glow)">
                    <animateMotion dur="4s" repeatCount="indefinite" begin="3s">
                      <path d="M0 0 Q50 -30 100 0 Q150 30 200 0 Q250 -30 300 0 Q350 30 400 0 Q450 -30 500 0 Q550 30 600 0 Q650 -30 700 0 Q750 30 800 0" />
                    </animateMotion>
                    <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Temperature Control with Glow */}
                  <rect x="340" y="265" width="100" height="35" fill="#DC2626" rx="15" filter="url(#shadow)" />
                  <rect x="342" y="267" width="96" height="31" fill="#EF4444" rx="14" />
                  <circle cx="365" cy="282" r="10" fill="#FCA5A5" opacity="0.8" />
                  <circle cx="365" cy="282" r="7" fill="#FEE2E2">
                    <animate attributeName="r" values="6;8;6" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <text x="390" y="290" fill="white" fontSize="11" fontWeight="bold">HEAT 25°C</text>

                  {/* Temperature Connection */}
                  <line x1="390" y1="230" x2="390" y2="265" stroke="rgba(220,38,38,0.3)" strokeWidth="4" />
                  <line x1="390" y1="230" x2="390" y2="265" stroke="url(#flowGradient)" strokeWidth="2.5" strokeDasharray="0,35">
                    <animate attributeName="stroke-dasharray" values="0,35;35,0" dur="2s" repeatCount="indefinite" />
                  </line>
                  <polygon points="388,225 392,235 388,233" fill="#DC2626" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                  </polygon>

                  {/* Pressure Sensor with Glow */}
                  <circle cx="450" cy="270" r="18" fill="url(#reactorGlow)" />
                  <circle cx="450" cy="270" r="16" fill="#F59E0B" filter="url(#shadow)" />
                  <circle cx="450" cy="270" r="14" fill="#FBBF24" />
                  <circle cx="450" cy="270" r="10" fill="#FCD34D" opacity="0.6" />
                  <text x="450" y="277" textAnchor="middle" fill="#92400E" fontSize="13" fontWeight="bold">P</text>

                  {/* Pressure Connection */}
                  <line x1="450" y1="230" x2="450" y2="254" stroke="rgba(245,158,11,0.3)" strokeWidth="3" />
                  <line x1="450" y1="230" x2="450" y2="254" stroke="url(#flowGradient)" strokeWidth="2" strokeDasharray="0,24">
                    <animate attributeName="stroke-dasharray" values="0,24;24,0" dur="1.8s" repeatCount="indefinite" />
                  </line>
                  <polygon points="448,225 452,235 448,233" fill="#F59E0B" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />
                  </polygon>

                  {/* Flow Rate Monitor with Glow */}
                  <rect x="495" y="260" width="70" height="25" fill="#6B7280" rx="12" filter="url(#shadow)" />
                  <rect x="497" y="262" width="66" height="21" fill="#9CA3AF" rx="11" />
                  <rect x="498" y="263" width="64" height="19" fill="#D1D5DB" rx="10" />
                  <text x="530" y="280" textAnchor="middle" fill="#374151" fontSize="8" fontWeight="bold">FLOW</text>
                  <text x="530" y="289" textAnchor="middle" fill="#374151" fontSize="7">2 mL/min</text>

                  {/* Flow Rate Connection */}
                  <line x1="530" y1="230" x2="530" y2="260" stroke="rgba(107,114,128,0.3)" strokeWidth="3" />
                  <line x1="530" y1="230" x2="530" y2="260" stroke="url(#flowGradient)" strokeWidth="2" strokeDasharray="0,30">
                    <animate attributeName="stroke-dasharray" values="0,30;30,0" dur="1.6s" repeatCount="indefinite" />
                  </line>
                  <polygon points="528,225 532,235 528,233" fill="#6B7280" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.6s" />
                  </polygon>

                  {/* Outlet Tube */}
                  <line x1="785" y1="210" x2="820" y2="210" stroke="#6B7280" strokeWidth="8" />
                  <line x1="785" y1="210" x2="820" y2="210" stroke="url(#flowGradient)" strokeWidth="6" strokeDasharray="0,35">
                    <animate attributeName="stroke-dasharray" values="0,35;35,0" dur="2.5s" repeatCount="indefinite" />
                  </line>

                  {/* Product Collection Vessel with Enhanced Styling */}
                  <ellipse cx="850" cy="240" rx="32" ry="52" fill="url(#reactorGlow)" />
                  <ellipse cx="850" cy="240" rx="30" ry="50" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="3" filter="url(#shadow)" />
                  <ellipse cx="850" cy="240" rx="29" ry="49" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
                  <rect x="835" y="215" width="30" height="50" fill="#10B981" opacity="0.75" rx="2" />
                  <rect x="836" y="216" width="28" height="48" fill="#86EFAC" opacity="0.3" rx="2" />
                  <circle cx="850" cy="235" r="4" fill="#FFFFFF" opacity="0.4" />
                  <text x="850" y="305" textAnchor="middle" fill="#16A34A" fontSize="12" fontWeight="bold">PRODUCT</text>

                  {/* Connection from outlet to product collection */}
                  <line x1="820" y1="210" x2="835" y2="240" stroke="#6B7280" strokeWidth="6" />
                  <line x1="820" y1="210" x2="835" y2="240" stroke="url(#flowGradient)" strokeWidth="4" strokeDasharray="0,25">
                    <animate attributeName="stroke-dasharray" values="0,25;25,0" dur="1.8s" repeatCount="indefinite" />
                  </line>

                  {/* Spectrometer with Glow */}
                  <rect x="645" y="275" width="80" height="30" fill="#8B5CF6" rx="15" filter="url(#shadow)" />
                  <rect x="647" y="277" width="76" height="26" fill="#A78BFA" rx="14" />
                  <circle cx="665" cy="292" r="5" fill="#E9D5FF" />
                  <text x="705" y="297" fill="white" fontSize="9" fontWeight="bold">SPEC</text>

                  {/* Spectrometer Connection */}
                  <line x1="685" y1="230" x2="685" y2="275" stroke="rgba(139,92,246,0.3)" strokeWidth="3" />
                  <line x1="685" y1="230" x2="685" y2="275" stroke="url(#flowGradient)" strokeWidth="2" strokeDasharray="0,45">
                    <animate attributeName="stroke-dasharray" values="0,45;45,0" dur="2.2s" repeatCount="indefinite" />
                  </line>
                  <polygon points="683,225 687,235 683,233" fill="#8B5CF6" opacity="0.9">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.9s" />
                  </polygon>

                  {/* Flow direction arrows */}
                  <polygon points="140,158 150,160 140,162" fill="#3B82F6" opacity="0.8">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                  </polygon>
                  <polygon points="140,258 150,260 140,262" fill="#10B981" opacity="0.8">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="0.5s" />
                  </polygon>
                  <polygon points="810,208 820,210 810,212" fill="#EF4444" opacity="0.8">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" begin="1s" />
                  </polygon>
                </svg>
              </div>

              {/* Process Parameters */}
              <div className="grid md:grid-cols-4 gap-4 mt-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">25°C</div>
                  <div className="text-sm text-gray-600">Temperature</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">2 mL/min</div>
                  <div className="text-sm text-gray-600">Flow Rate</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">5 bar</div>
                  <div className="text-sm text-gray-600">Pressure</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">95%</div>
                  <div className="text-sm text-gray-600">Yield</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-900">Meet Our Team</h3>
          <p className="text-gray-600 text-center mb-8">
            Here are our main contacts. Feel free to reach out to any of us directly.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <img src="https://tekflowlabs.com/assets/surya.jpg" alt="Bala Surya deep Tammineedi" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              <h4 className="text-xl font-semibold text-gray-900">Bala Surya deep Tammineedi</h4>
              <p className="text-gray-600">Chief Technology Officer</p>
              <p className="text-gray-500 text-sm">MS in Chemical Engineering, Germany</p>
              <p className="text-blue-600">surya@tekflowlabs.com</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <img src="https://tekflowlabs.com/assets/vijay.jpg" alt="Dr. Vijay Kumar Kotagiri" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              <h4 className="text-xl font-semibold text-gray-900">Dr. Vijay Kumar Kotagiri</h4>
              <p className="text-gray-600">Chief Scientist</p>
              <p className="text-gray-500 text-sm">Doctor of Philosophy- PhD, Chemistry</p>
              <p className="text-blue-600">info@tekflowlabs.com</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <img src="https://tekflowlabs.com/assets/rk.jpg" alt="Ramakanth Reddy Kowdampalli" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              <h4 className="text-xl font-semibold text-gray-900">Ramakanth Reddy Kowdampalli</h4>
              <p className="text-gray-600">Business Development Head</p>
              <p className="text-gray-500 text-sm">MS in Automotive software Engineering, Germany</p>
              <p className="text-blue-600">admin@tekflowlabs.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold mb-8 text-gray-900">Contact Us</h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">Registered Office</h4>
              <p className="text-gray-600">6-84, Maharajpet, Gopularam, Hyderabad, Telangana 501203</p>
              <p className="text-gray-600">+91 6281733404</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">Lab Office</h4>
              <p className="text-gray-600">Road no 11, Plot no: 22-23, ALEAP Industrial Estate, Near Pragathi Nagar, Kukatpally, Hyderabad 500072, Telangana, India</p>
              <p className="text-gray-600">+91 6281733404</p>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-500">
              <h4 className="text-2xl font-semibold mb-4 text-gray-900">💬 Quick Support</h4>
              <p className="text-gray-600 mb-4">Chat with us directly on WhatsApp</p>
              <a 
                href="https://wa.me/917702475719?text=Hi%20TekflowLabs%2C%20I%20would%20like%20to%20know%20more%20about%20MyLab%20Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                📱 WhatsApp: +91 7702475719
              </a>
            </div>
          </div>
          <p className="text-gray-500 mt-8">© 2024 TekflowLabs. All rights reserved.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center space-x-6 mb-4">
            <a href="#home" className="text-gray-400 hover:text-white">Home</a>
            <a href="#about" className="text-gray-400 hover:text-white">About</a>
            <a href="#services" className="text-gray-400 hover:text-white">Services</a>
            <a href="#business-model" className="text-gray-400 hover:text-white">Business Model</a>
            <a href="#technology" className="text-gray-400 hover:text-white">Technology</a>
            <a href="#contact" className="text-gray-400 hover:text-white">Contact</a>
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Access MyLab Platform
          </Button>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/917702475719?text=Hi%20TekflowLabs%2C%20I%20would%20like%20to%20know%20more%20about%20MyLab%20Platform"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-50 flex items-center justify-center text-2xl"
        title="Chat with us on WhatsApp"
      >
        <svg className="w-7 h-7" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16.6 0C7.4 0 0 7.4 0 16.6c0 2.9.8 5.8 2.2 8.3L0 32l7.3-2.1c2.4 1.3 5.1 2 7.9 2 9.2 0 16.6-7.4 16.6-16.6C33.2 7.4 25.8 0 16.6 0zm0 30c-2.6 0-5.1-.7-7.3-2l-.5-.3-4.3 1.2 1.2-4.2-.3-.5c-1.4-2.2-2.1-4.7-2.1-7.2C3.3 8.7 9 3 16 3c7 0 12.7 5.7 12.7 12.7S23 30 16.6 30zm7.4-9.2c-.4-.2-2.3-1.1-2.7-1.2-.4-.2-.7-.2-1 .2-.3.4-1.1 1.2-1.4 1.5-.3.3-.5.3-.9.1-2.5-1.2-4.1-2.2-5.7-5-.4-.7.4-.7 1.1-2.3.1-.3 0-.6-.1-.8-.2-.2-1-.2-1.3-2.8-.3-.6-.6-.5-.9-.5-.2 0-.5 0-.8 0s-.8.1-1.2.6c-.4.5-1.6 1.5-1.6 3.6 0 2.1 1.6 4.1 1.8 4.4.2.3 3.2 5 7.7 7 .9.4 1.6.6 2.2.8.9.3 1.8.3 2.4.2.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z" />
        </svg>
      </a>
    </div>
  );
};

export default LandingPage;