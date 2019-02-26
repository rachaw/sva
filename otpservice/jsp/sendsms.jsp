<%@page import="java.util.Random"%>
<%@page import="java.util.ArrayList"%>
<%@page import="java.util.List"%>
<%@page import="com.twilio.type.PhoneNumber"%>
<%@page import="com.twilio.rest.api.v2010.account.Message"%>
<%@page import="com.twilio.Twilio"%>
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="ISO-8859-1"%>
<%
	String ACCOUNT_SID = "ACb8c031280aa52007cc6272ef41db00fc";
	
	String AUTH_TOKEN = "2fedc431984d3b8e8d9a1e2b06af71f9";
	
	Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
	List<Integer> list = new ArrayList<Integer>(); 
        // add 5 element in ArrayList 
        list.add(10250); 
        list.add(15432); 
        list.add(67543); 
        list.add(85489); 
        list.add(20618);
        Random rand = new Random();
        int otp = list.get(rand.nextInt(list.size()));  
	String msisdn = "+91" + request.getParameter("msisdn");
	
	Message message = Message.creator(new PhoneNumber(msisdn),
			        new PhoneNumber("+14065455008 "), 
			        "Please enter " + otp + " to authenticate your self.").create();
		
	out.println(message.getSid());
%>